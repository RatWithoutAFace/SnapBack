const { exec } = require('child_process');
function removeStartup() {
    const platform = process.platform;
    const scriptPath = process.argv[1];
    let startupCommand = '';
  
    if (platform === 'win32') {
      // Removes the script from startup for Windows
      startupCommand = `
        powershell.exe -Command "Start-Process powershell -ArgumentList '-NoProfile -ExecutionPolicy Bypass -Command \\"Remove-ItemProperty -Path \'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run\' -Name \'SnapBack\' -Force\\"' -Verb runAs"
      `;
    } else if (platform === 'darwin') {
      // Removes the script from startup for macOS
      startupCommand = `
        osascript -e 'do shell script "osascript -e \\"tell application \'loginwindow\' to delete (every login item whose name is \'SnapBack\')\\" with administrator privileges"'
      `;
    } else { // Linux
      // Removes the script from startup for Linux
      startupCommand = `
        rm /etc/xdg/autostart/SnapBack.desktop
      `;
    }

    console.log(startupCommand);
  
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
removeStartup();