' VBS скрипт для создания ярлыка на рабочем столе
' Просто запустите этот файл двойным кликом

Set WshShell = WScript.CreateObject("WScript.Shell")
Set oShellLink = WshShell.CreateShortcut(WshShell.SpecialFolders("Desktop") & "\IT Hub Schedule.lnk")

' Путь к .bat файлу
batPath = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName) & "\ЗАПУСТИТЬ_ПРИЛОЖЕНИЕ.bat"

oShellLink.TargetPath = batPath
oShellLink.WorkingDirectory = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
oShellLink.Description = "Запустить IT Hub Schedule - Генератор расписания колледжа"
oShellLink.WindowStyle = 1
oShellLink.Save

WScript.Echo "✅ Ярлык 'IT Hub Schedule' создан на рабочем столе!" & vbCrLf & vbCrLf & "Теперь просто запустите его двойным кликом!"

