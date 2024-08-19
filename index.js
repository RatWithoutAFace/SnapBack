const childProcess = require('child_process');
const exec = require('child_process').exec;
const fs = require('fs');
const SysTray = require('systray');
const path = require('path');
const Webhook = require('discord-webhook-node').Webhook;
const screenshot = require('screenshot-desktop');
const sharp = require('sharp');
const axios = require('axios').default;
const figlet = require('figlet');
const gradient = require('gradient-string');
const chalk = require('chalk');
const inquirer = require('inquirer').default;
const title = gradient.summer(figlet.textSync('SnapBack', { font: 'Small Slant' }))+`\n${chalk.greenBright('v1.0.0-beta - By @RatWithAFace')}\n`;
let config = require('./resources/config.json');

function reloadConfig() {
  // Delete the cache and update the configuration
  delete require.cache[require.resolve('./resources/config.json')];
  config = require('./resources/config.json');
  console.log('Successfully reloaded configuration!')
}

function ss() {
  screenshot().then(async (image) => {
    if (!image) {
      console.error('Failed to capture screenshot');
      return;
    }
    
    // Create timestamp text
    await sharp({ 
      text: {
        text: `${new Date().toLocaleString()}`,
        font: 'Arial',
        dpi: 300
      }
    }).toFormat('png').toBuffer().then((buffer) => {
      sharp(image).toBuffer().then((ssBuffer) => { 
        if (config.method === 1 || config.method === 3) {
          // Method 1:Save to local folder
          // Check if library directory exists, if not, create it
          const libDir = 'library';
          if (!fs.existsSync('./library')) {
          fs.mkdirSync('./library');
          }
          // Composite the timestamp text onto the screenshot
          sharp(ssBuffer).toFormat('jpg')
          .composite([{
            input: buffer,
            gravity: 'northwest'
          }]).toFile(`./library/${fs.readdirSync('./library').length}.jpg`); // Save the screenshot
        }
        if (config.method === 2 || config.method === 3) {
          // Method 2: Discord Webhook
          sharp(ssBuffer).toFormat('jpg')
          .composite([{
            input: buffer,
            gravity: 'northwest'
          }]).toFile('./resources/temp.jpg').then(() => {
            const webhook = new Webhook(config.webhookURL);
            webhook.sendFile('./resources/temp.jpg');
          });
        }
      })
    })
  }).catch((err) => {
    console.error(err);
  });
}

function detatch() {
  // Detach the process from the terminal and run it in the background
  
  const child = childProcess.fork(__filename, [], {
    detached: true,
    stdio: ['ignore', 'ignore', 'ignore', 'ipc']
  });

  child.unref();

  // Close the terminal window
  process.exit(0);
  // Comment out the rest of this function and uncomment the backgroundProcess() function below to run undetached.
  //backgroundProcess();
}

function backgroundProcess() {
  // Grab appropriate icon
  if (!process.platform === 'win32') {
    var imagePath = path.join(__dirname, 'resources', 'icon.png');
  } else {
    var imagePath = path.join(__dirname, 'resources', 'icon.ico');
  }

  // Turn the icon into a base64 string to be loaded into the systray
  const imageBuffer = fs.readFileSync(imagePath);
  const base64String = imageBuffer.toString('base64');
  const menuItems = [{
    title: 'Exit',
    tooltip: 'Exit SnapBack',
    checked: false,
    enabled: true,
  },
  {
    title: 'Screenshot Now',
    tooltip: 'Take a screenshot',
    checked: false,
    enabled: true,
  }]

  if (config.method === 1 || config.method === 3) {
    menuItems.push({
      title: 'Open Library',
      tooltip: 'Open library folder',
      checked: false,
      enabled: true,
    })
  }

  // Create the systray icon
  const tray =  new SysTray.default({
    menu: {
      title: 'SnapBack',
      icon: `${base64String}`,
      tooltip: 'SnapBack',
      items: menuItems,
    }
  });

  // Handle clicks on the icon
  tray.onClick(action => {
    if (action.seq_id === 0) {
      process.exit(0);
    } else if (action.seq_id === 1) {
      ss();
    } else if  (action.seq_id === 2) {
      if (process.platform === 'win32') {
        exec(`explorer.exe ${path.join(__dirname, "library")}`)
      } else if (process.platform === 'darwin') {
        exec(`open ${path.join(__dirname, 'library')}`)
      } else {
        exec(`xdg-open ${path.join(__dirname, 'library')}`)
      }
    }
  })

  function loop() {
    ss();
    setTimeout(loop, Math.floor(Math.random() * 1200000) + 600000);
  }
  loop();
}

function startup() {
  console.clear();
  console.log(title);
  console.log(chalk.yellowBright('The SnapBack background process will start in 5 seconds...\nYou can exit by clicking on the icon in the system tray/menu bar and then clicking on Exit.'));
    
  setTimeout(() => {
    // Detatches the process from the terminal and runs SnapBack in the background
    detatch();
  }, 5000);
}

// This code will only run if the script is being run as a child process
if (process.send) {
  backgroundProcess();
}

if (!config.config) {
  console.clear();
  console.log(title);
  inquirer.prompt([{
    type: 'confirm',
    name: 'startup',
    message: 'Would you like to run SnapBack on startup?',
    default: true,
  }]).then(answerStartup => {
    let newConfig = {method: 0, startup: false, config: true}
    if (answerStartup.startup) {
      newConfig.startup = true
      const platform = process.platform;
      const scriptPath = process.argv[1];
      let startupCommand = '';
      
      if (platform === 'win32') {
        // Adds the script to startup for Windows
        startupCommand = `
          powershell.exe -Command "Start-Process powershell -ArgumentList '-NoProfile -ExecutionPolicy Bypass -Command \\"Add-MpPreference -ExclusionPath \`${scriptPath}\`; New-ItemProperty -Path \`'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run\`' -Name \`'SnapBack\`' -Value \`'node ${scriptPath}\`' -PropertyType String -Force\\"' -Verb runAs"
        `;
      } else if (platform === 'darwin') {
        // Adds the script to startup for macOS
        startupCommand = `
          osascript -e 'do shell script "osascript -e \\"tell application \`loginwindow\` to make login item at end with properties {path:\`\\"${scriptPath}\\"\\\`, hidden:false}\\"" with administrator privileges'
        `;
      } else { // Linux
        // Adds the script to startup for Linux
        startupCommand = `
          echo "[Desktop Entry]
      Type=Application
      Exec=sudo node ${scriptPath}
      Hidden=false
      X-GNOME-Autostart-enabled=true
      Name=SnapBack
      Comment=SnapBack" | sudo tee /etc/xdg/autostart/SnapBack.desktop
        `;
      }
      
      exec(startupCommand, (error, stdout, stderr) => {
        if (error) {
          console.error(`Error executing startup command: ${error.message}`);
          return;
        }
        if (stderr) {
          console.error(`stderr: ${stderr}`);
          return;
        }
        console.log(`stdout: ${stdout}`);
      })
      
    }
    inquirer.prompt([{
      type: 'list',
      name: 'method',
      message: 'How would you like to save your screenshots?',
      choices: ['Local Folder', 'Discord Webhook', 'Both']
    }]).then(answersMethod => {
      if (answersMethod.method === 'Discord Webhook' || answersMethod.method === 'Both') {
        inquirer.prompt([{
          type: 'input',
          name: 'webhook',
          message: 'Enter your Discord Webhook URL:',
        }]).then(answersWebhook => {
          newConfig.webhookURL = answersWebhook.webhook
          newConfig.method = answersMethod.method === 'Discord Webhook' ? 2 : 3
          fs.writeFileSync('./resources/config.json', JSON.stringify(newConfig));
          startup();
          reloadConfig();
        })
      } else if (answersMethod.method === 'Local Folder') {
        newConfig.method = 1
        fs.writeFileSync('./resources/config.json', JSON.stringify(newConfig));
        startup()
        reloadConfig();
      }
    })
    
  })
} else {
  startup();
}