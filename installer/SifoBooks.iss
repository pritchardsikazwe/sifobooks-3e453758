; SifoBooks Windows Installer
; Built from the portable desktop package.
; Local application data is kept outside the installation directory so
; upgrades/uninstalls do not delete the company's SQLite database.

#define MyAppName "SifoBooks"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "SifoBooks"
#define MyAppExeName "sifobooks.exe"

[Setup]
AppId={{8F9F3D7A-8D8E-4E4C-9B4A-3E0A7A8E1F61}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={autopf}\SifoBooks
DefaultGroupName=SifoBooks
OutputDir=installer-dist
OutputBaseFilename=SifoBooks-Setup
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
ArchitecturesInstallIn64BitMode=x64compatible
PrivilegesRequired=admin
UninstallDisplayIcon={app}\{#MyAppExeName}
SetupIconFile={app}\client\favicon.ico
ChangesAssociations=no

[Files]
Source: "desktop-dist\sifobooks.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "desktop-dist\schema.sql"; DestDir: "{app}"; Flags: ignoreversion
Source: "desktop-dist\client\*"; DestDir: "{app}\client"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "desktop-dist\start-sifobooks.bat"; DestDir: "{app}"; Flags: ignoreversion

[Dirs]
Name: "{app}\data"

[Icons]
Name: "{autoprograms}\SifoBooks"; Filename: "{app}\{#MyAppExeName}"; WorkingDir: "{app}"
Name: "{autodesktop}\SifoBooks"; Filename: "{app}\{#MyAppExeName}"; WorkingDir: "{app}"

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "Launch SifoBooks"; Flags: nowait postinstall skipifsilent

[UninstallDelete]
; Delete only empty installation directories. Never delete {app}\data.
Type: dirifempty; Name: "{app}\data"
Type: dirifempty; Name: "{app}"

[Code]
function PrepareToInstall(var NeedsRestart: String): String;
begin
  Result := '';
  if FileExists(ExpandConstant('{app}\sifobooks.exe')) then
  begin
    if MsgBox('SifoBooks may be running. Close it before continuing so the installation can update safely.', mbConfirmation, MB_OKCANCEL) = IDCANCEL then
      Result := 'Please close SifoBooks and run the installer again.';
  end;
end;
