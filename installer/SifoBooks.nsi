; SifoBooks Enterprise Windows installer (NSIS) — buildable from Linux with makensis.
; Mirrors SifoBooks.iss.template: data in C:\ProgramData\SifoBooks is never removed.
Unicode true
!include "MUI2.nsh"
!include "x64.nsh"

!ifndef APP_VERSION
  !define APP_VERSION "2026.9.28"
!endif
!ifndef FILE_VERSION
  !define FILE_VERSION "2026.9.28.0"
!endif
!define PRODUCT "SifoBooks"
!define PUBLISHER "Sifonet Technologies"
!define UNINST_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\SifoBooks-enterprise"

Name "${PRODUCT} Enterprise"
OutFile "..\installer-dist\SifoBooks-enterprise-Windows-Setup.exe"
InstallDir "$PROGRAMFILES64\SifoBooks\enterprise"
InstallDirRegKey HKLM "${UNINST_KEY}" "InstallLocation"
RequestExecutionLevel admin
SetCompressor /SOLID lzma
Icon "..\desktop-dist\SifoBooks.ico"
UninstallIcon "..\desktop-dist\SifoBooks.ico"

VIProductVersion "${FILE_VERSION}"
VIAddVersionKey "ProductName" "${PRODUCT} Enterprise"
VIAddVersionKey "CompanyName" "${PUBLISHER}"
VIAddVersionKey "FileDescription" "${PRODUCT} Enterprise (x64) Setup"
VIAddVersionKey "FileVersion" "${APP_VERSION}"
VIAddVersionKey "ProductVersion" "${APP_VERSION}"
VIAddVersionKey "LegalCopyright" "Copyright (c) 2026 ${PUBLISHER}"

!define MUI_ICON "..\desktop-dist\SifoBooks.ico"
!define MUI_UNICON "..\desktop-dist\SifoBooks.ico"
!define MUI_FINISHPAGE_RUN "$INSTDIR\SifoBooks.exe"
!define MUI_FINISHPAGE_RUN_NOTCHECKED
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_COMPONENTS
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "English"

Function .onInit
  ${IfNot} ${RunningX64}
    MessageBox MB_ICONSTOP "SifoBooks requires 64-bit Windows."
    Abort
  ${EndIf}
  SetRegView 64
FunctionEnd

Section "SifoBooks (required)" SecMain
  SectionIn RO
  ; Stop a running copy cleanly before upgrading files.
  IfFileExists "$INSTDIR\Stop-SifoBooks.ps1" 0 +2
    nsExec::Exec 'powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "$INSTDIR\Stop-SifoBooks.ps1"'
  Sleep 1500

  SetOutPath "$INSTDIR"
  SetOverwrite on
  File /r /x "backups" /x "data" /x "logs" "..\desktop-dist\*.*"

  ; Shared data folders (kept on uninstall / upgrade). Users get Modify rights.
  CreateDirectory "$COMMONAPPDATA\SifoBooks"
  CreateDirectory "$COMMONAPPDATA\SifoBooks\data"
  CreateDirectory "$COMMONAPPDATA\SifoBooks\backups"
  CreateDirectory "$COMMONAPPDATA\SifoBooks\config"
  CreateDirectory "$COMMONAPPDATA\SifoBooks\logs"
  nsExec::Exec 'icacls "$COMMONAPPDATA\SifoBooks" /grant *S-1-5-32-545:(OI)(CI)M /T /C /Q'

  CreateDirectory "$SMPROGRAMS\SifoBooks"
  CreateShortcut "$SMPROGRAMS\SifoBooks\SifoBooks.lnk" "$INSTDIR\SifoBooks.exe" "" "$INSTDIR\SifoBooks.ico" 0
  CreateShortcut "$SMPROGRAMS\SifoBooks\Stop SifoBooks.lnk" "$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" '-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "$INSTDIR\Stop-SifoBooks.ps1"' "$INSTDIR\SifoBooks.ico" 0
  CreateShortcut "$SMPROGRAMS\SifoBooks\Uninstall SifoBooks.lnk" "$INSTDIR\Uninstall.exe"

  WriteUninstaller "$INSTDIR\Uninstall.exe"
  WriteRegStr HKLM "${UNINST_KEY}" "DisplayName" "${PRODUCT} Enterprise"
  WriteRegStr HKLM "${UNINST_KEY}" "DisplayVersion" "${APP_VERSION}"
  WriteRegStr HKLM "${UNINST_KEY}" "Publisher" "${PUBLISHER}"
  WriteRegStr HKLM "${UNINST_KEY}" "DisplayIcon" "$INSTDIR\SifoBooks.ico"
  WriteRegStr HKLM "${UNINST_KEY}" "InstallLocation" "$INSTDIR"
  WriteRegStr HKLM "${UNINST_KEY}" "UninstallString" '"$INSTDIR\Uninstall.exe"'
  WriteRegDWORD HKLM "${UNINST_KEY}" "NoModify" 1
  WriteRegDWORD HKLM "${UNINST_KEY}" "NoRepair" 1
SectionEnd

Section "Desktop shortcut" SecDesktop
  SetShellVarContext all
  CreateShortcut "$DESKTOP\SifoBooks.lnk" "$INSTDIR\SifoBooks.exe" "" "$INSTDIR\SifoBooks.ico" 0
  SetShellVarContext current
SectionEnd

Section /o "Start automatically with Windows" SecStartup
  SetShellVarContext all
  CreateShortcut "$SMSTARTUP\SifoBooks.lnk" "$INSTDIR\SifoBooks.exe" "" "$INSTDIR\SifoBooks.ico" 0
  SetShellVarContext current
SectionEnd

Section "Uninstall"
  SetRegView 64
  IfFileExists "$INSTDIR\Stop-SifoBooks.ps1" 0 +2
    nsExec::Exec 'powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "$INSTDIR\Stop-SifoBooks.ps1"'
  Sleep 1500
  ; Remove program files only. C:\ProgramData\SifoBooks (company database,
  ; backups, config, logs) and any legacy $INSTDIR\data are NEVER deleted.
  RMDir /r "$INSTDIR\client"
  RMDir /r "$INSTDIR\config"
  Delete "$INSTDIR\*.exe"
  Delete "$INSTDIR\*.ico"
  Delete "$INSTDIR\*.json"
  Delete "$INSTDIR\*.txt"
  Delete "$INSTDIR\*.md"
  Delete "$INSTDIR\*.ps1"
  Delete "$INSTDIR\*.bat"
  Delete "$INSTDIR\*.vbs"
  Delete "$INSTDIR\.env.example"
  Delete "$INSTDIR\.sifobooks-migrations.bin"
  RMDir "$INSTDIR"
  RMDir /r "$SMPROGRAMS\SifoBooks"
  SetShellVarContext all
  Delete "$DESKTOP\SifoBooks.lnk"
  Delete "$SMSTARTUP\SifoBooks.lnk"
  RMDir /r "$SMPROGRAMS\SifoBooks"
  DeleteRegKey HKLM "${UNINST_KEY}"
SectionEnd
