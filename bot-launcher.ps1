$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
[System.Windows.Forms.Application]::EnableVisualStyles()

$script:projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$script:nodePath = (Get-Command node -ErrorAction Stop).Source
$script:launcherRunId = Get-Date -Format 'yyyyMMdd-HHmmss-fff'
$script:singleInstanceMutex = $null
$script:botProcess = $null
$script:dashboardProcess = $null
$script:dashboardOpened = $false
$script:logFile = Join-Path $script:projectRoot "launcher-error-$($script:launcherRunId).log"
$script:botOutputFile = $null
$script:dashboardOutputFile = $null
$script:botReadOffset = 0
$script:dashboardReadOffset = 0

function New-RunLogFile {
    param([string]$Prefix)

    $timestamp = Get-Date -Format 'yyyyMMdd-HHmmss-fff'
    return Join-Path $script:projectRoot "$Prefix-$timestamp.log"
}

function Initialize-SingleInstance {
    $mutexName = 'MediaPrestigeBotLauncherSingleton'
    $createdNew = $false
    $script:singleInstanceMutex = New-Object System.Threading.Mutex($true, $mutexName, [ref]$createdNew)

    if (-not $createdNew) {
        [System.Windows.Forms.MessageBox]::Show(
            'The launcher is already open. Please use the existing window or close it before starting another one.',
            'Launcher Already Running',
            [System.Windows.Forms.MessageBoxButtons]::OK,
            [System.Windows.Forms.MessageBoxIcon]::Information
        ) | Out-Null
        exit
    }
}

function Release-SingleInstance {
    if ($script:singleInstanceMutex) {
        try {
            $script:singleInstanceMutex.ReleaseMutex()
        }
        catch {}
        finally {
            $script:singleInstanceMutex.Dispose()
            $script:singleInstanceMutex = $null
        }
    }
}

function Show-LauncherError {
    param([string]$Message)

    Write-CrashLog $Message

    try {
        [System.Windows.Forms.MessageBox]::Show(
            $Message,
            'Launcher Error',
            [System.Windows.Forms.MessageBoxButtons]::OK,
            [System.Windows.Forms.MessageBoxIcon]::Error
        ) | Out-Null
    }
    catch {}
}

function Write-CrashLog {
    param([string]$Message)

    $timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    $line = "[$timestamp] $Message"

    try {
        $stream = [System.IO.File]::Open($script:logFile, [System.IO.FileMode]::Append, [System.IO.FileAccess]::Write, [System.IO.FileShare]::ReadWrite)
        try {
            $writer = New-Object System.IO.StreamWriter($stream, [System.Text.Encoding]::UTF8)
            try {
                $writer.WriteLine($line)
                $writer.Flush()
            }
            finally {
                $writer.Dispose()
            }
        }
        finally {
            $stream.Dispose()
        }
    }
    catch {
        # Avoid crashing the launcher if the diagnostic log itself cannot be written.
    }
}

function Add-Log {
    param([string]$Message)

    if ([string]::IsNullOrWhiteSpace($Message)) {
        return
    }

    $timestamp = Get-Date -Format 'HH:mm:ss'
    $line = "[$timestamp] $Message"
    Write-CrashLog $Message

    try {
        if (-not $logBox -or $logBox.IsDisposed) {
            return
        }

        if ($logBox.InvokeRequired) {
            $logBox.BeginInvoke([Action]{
                if ($logBox -and -not $logBox.IsDisposed) {
                    $logBox.AppendText($line + [Environment]::NewLine)
                    $logBox.SelectionStart = $logBox.TextLength
                    $logBox.ScrollToCaret()
                }
            }) | Out-Null
        }
        else {
            $logBox.AppendText($line + [Environment]::NewLine)
            $logBox.SelectionStart = $logBox.TextLength
            $logBox.ScrollToCaret()
        }
    }
    catch {}
}

function Update-Status {
    param([string]$Text, [System.Drawing.Color]$Color)

    if (-not $statusLabel -or $statusLabel.IsDisposed) {
        return
    }

    if ($statusLabel.InvokeRequired) {
        $statusLabel.BeginInvoke([Action]{
            if ($statusLabel -and -not $statusLabel.IsDisposed) {
                $statusLabel.Text = $Text
                $statusLabel.ForeColor = $Color
            }
        }) | Out-Null
    }
    else {
        $statusLabel.Text = $Text
        $statusLabel.ForeColor = $Color
    }
}

function Set-RunningState {
    param([bool]$IsRunning)

    if (-not $startButton -or $startButton.IsDisposed -or -not $stopButton -or $stopButton.IsDisposed) {
        return
    }

    if ($startButton.InvokeRequired) {
        $startButton.BeginInvoke([Action]{
            if ($startButton -and -not $startButton.IsDisposed -and $stopButton -and -not $stopButton.IsDisposed) {
                $startButton.Enabled = -not $IsRunning
                $stopButton.Enabled = $IsRunning
                $startButton.BackColor = if ($IsRunning) { [System.Drawing.Color]::FromArgb(76, 76, 76) } else { [System.Drawing.Color]::FromArgb(199, 168, 106) }
                $stopButton.BackColor = if ($IsRunning) { [System.Drawing.Color]::FromArgb(121, 54, 54) } else { [System.Drawing.Color]::FromArgb(54, 54, 54) }
            }
        }) | Out-Null
    }
    else {
        $startButton.Enabled = -not $IsRunning
        $stopButton.Enabled = $IsRunning
        $startButton.BackColor = if ($IsRunning) { [System.Drawing.Color]::FromArgb(76, 76, 76) } else { [System.Drawing.Color]::FromArgb(199, 168, 106) }
        $stopButton.BackColor = if ($IsRunning) { [System.Drawing.Color]::FromArgb(121, 54, 54) } else { [System.Drawing.Color]::FromArgb(54, 54, 54) }
    }
}

function Style-Button {
    param(
        [System.Windows.Forms.Button]$Button,
        [System.Drawing.Color]$BackColor,
        [System.Drawing.Color]$ForeColor
    )

    $Button.FlatStyle = 'Flat'
    $Button.FlatAppearance.BorderSize = 0
    $Button.BackColor = $BackColor
    $Button.ForeColor = $ForeColor
    $Button.Cursor = [System.Windows.Forms.Cursors]::Hand
    $Button.Font = New-Object System.Drawing.Font('Segoe UI Semibold', 10)
}

[System.Windows.Forms.Application]::SetUnhandledExceptionMode([System.Windows.Forms.UnhandledExceptionMode]::CatchException)
[System.Windows.Forms.Application]::add_ThreadException({
    param($sender, $eventArgs)
    Show-LauncherError "UI thread exception: $($eventArgs.Exception.Message)"
})

[System.AppDomain]::CurrentDomain.add_UnhandledException({
    param($sender, $eventArgs)
    $exceptionObject = $eventArgs.ExceptionObject
    if ($exceptionObject -is [System.Exception]) {
        Show-LauncherError "Unhandled exception: $($exceptionObject.Message)"
    }
    else {
        Show-LauncherError 'Unhandled launcher failure.'
    }
})

function Stop-ManagedProcess {
    param(
        [System.Diagnostics.Process]$Process,
        [string]$Name
    )

    if (-not $Process) {
        return
    }

    try {
        if (-not $Process.HasExited) {
            Add-Log "Stopping $Name..."
            $Process.Kill()
            $Process.WaitForExit(5000) | Out-Null
        }
    }
    catch {
        Add-Log "Could not stop $Name cleanly: $($_.Exception.Message)"
    }
    finally {
        $Process.Dispose()
    }
}

function Start-ManagedProcess {
    param(
        [string]$Name,
        [string]$ScriptName,
        [string]$OutputFile
    )

    $process = New-Object System.Diagnostics.Process
    $process.StartInfo = New-Object System.Diagnostics.ProcessStartInfo
    $process.StartInfo.FileName = $script:nodePath
    $process.StartInfo.Arguments = $ScriptName
    $process.StartInfo.WorkingDirectory = $script:projectRoot
    $process.StartInfo.UseShellExecute = $false
    $process.StartInfo.RedirectStandardOutput = $true
    $process.StartInfo.RedirectStandardError = $true
    $process.StartInfo.CreateNoWindow = $true
    $process.EnableRaisingEvents = $true

    $exitHandler = [System.EventHandler]{
        param($sender, $eventArgs)
        Add-Log "$Name stopped."

        if ($Name -eq 'Bot') {
            $script:botProcess = $null
        }

        if ($Name -eq 'Dashboard') {
            $script:dashboardProcess = $null
            $script:dashboardOpened = $false
        }

        if (-not $script:botProcess -and -not $script:dashboardProcess) {
            Set-RunningState -IsRunning $false
            Update-Status -Text 'Stopped' -Color ([System.Drawing.Color]::IndianRed)
        }
    }

    $process.add_Exited($exitHandler)

    $outputStream = [System.IO.File]::Open($OutputFile, [System.IO.FileMode]::Create, [System.IO.FileAccess]::Write, [System.IO.FileShare]::ReadWrite)
    $errorStream = [System.IO.File]::Open($OutputFile, [System.IO.FileMode]::Append, [System.IO.FileAccess]::Write, [System.IO.FileShare]::ReadWrite)
    $outputWriter = New-Object System.IO.StreamWriter($outputStream, [System.Text.Encoding]::UTF8)
    $errorWriter = New-Object System.IO.StreamWriter($errorStream, [System.Text.Encoding]::UTF8)
    $process.StartInfo.RedirectStandardOutput = $true
    $process.StartInfo.RedirectStandardError = $true

    $null = $process.Start()

    $stdoutJob = [System.Threading.Tasks.Task]::Run([Action]{
        try {
            while (-not $process.StandardOutput.EndOfStream) {
                $line = $process.StandardOutput.ReadLine()
                if ($null -ne $line) {
                    $outputWriter.WriteLine($line)
                    $outputWriter.Flush()
                }
            }
        }
        catch {}
        finally {
            $outputWriter.Dispose()
        }
    })

    $stderrJob = [System.Threading.Tasks.Task]::Run([Action]{
        try {
            while (-not $process.StandardError.EndOfStream) {
                $line = $process.StandardError.ReadLine()
                if ($null -ne $line) {
                    $errorWriter.WriteLine("ERROR: $line")
                    $errorWriter.Flush()
                }
            }
        }
        catch {}
        finally {
            $errorWriter.Dispose()
        }
    })

    $process | Add-Member -NotePropertyName OutputTask -NotePropertyValue $stdoutJob
    $process | Add-Member -NotePropertyName ErrorTask -NotePropertyValue $stderrJob
    Add-Log "$Name started with PID $($process.Id)."

    return $process
}

function Read-NewLogLines {
    param(
        [string]$FilePath,
        [ref]$Offset,
        [string]$Prefix
    )

    if ([string]::IsNullOrWhiteSpace($FilePath)) {
        return
    }

    if (-not (Test-Path $FilePath)) {
        return
    }

    $fileInfo = Get-Item $FilePath
    if ($fileInfo.Length -lt $Offset.Value) {
        $Offset.Value = 0
    }

    if ($fileInfo.Length -eq $Offset.Value) {
        return
    }

    $stream = [System.IO.File]::Open($FilePath, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::ReadWrite)
    try {
        $stream.Seek($Offset.Value, [System.IO.SeekOrigin]::Begin) | Out-Null
        $reader = New-Object System.IO.StreamReader($stream, [System.Text.Encoding]::UTF8)
        try {
            while (-not $reader.EndOfStream) {
                $line = $reader.ReadLine()
                if (-not [string]::IsNullOrWhiteSpace($line)) {
                    Add-Log "$Prefix$line"

                    if ($Prefix -eq 'Dashboard: ' -and -not $script:dashboardOpened -and $line -match 'http://localhost:3000') {
                        $script:dashboardOpened = $true
                        Open-Dashboard
                        Update-Status -Text 'Running' -Color ([System.Drawing.Color]::MediumSeaGreen)
                    }

                    if ($Prefix -eq 'Bot: ' -and $line -match 'ready') {
                        Update-Status -Text 'Running' -Color ([System.Drawing.Color]::MediumSeaGreen)
                    }
                }
            }
            $Offset.Value = $stream.Position
        }
        finally {
            $reader.Dispose()
        }
    }
    finally {
        $stream.Dispose()
    }
}

function Open-Dashboard {
    try {
        Start-Process "http://localhost:3000"
    }
    catch {
        Add-Log "Could not open dashboard automatically: $($_.Exception.Message)"
    }
}

function Start-App {
    try {
        if ($script:botProcess -or $script:dashboardProcess) {
            Add-Log 'The app is already running.'
            return
        }

        $script:dashboardOpened = $false
        $script:botOutputFile = New-RunLogFile -Prefix 'bot-output'
        $script:dashboardOutputFile = New-RunLogFile -Prefix 'dashboard-output'
        $script:botReadOffset = 0
        $script:dashboardReadOffset = 0
        Set-RunningState -IsRunning $true
        Update-Status -Text 'Starting...' -Color ([System.Drawing.Color]::Goldenrod)
        Add-Log "Project folder: $script:projectRoot"
        Add-Log "Using Node: $script:nodePath"
        Add-Log "Dashboard log: $script:dashboardOutputFile"
        Add-Log "Bot log: $script:botOutputFile"

        $script:dashboardProcess = Start-ManagedProcess -Name 'Dashboard' -ScriptName 'dashboard-server.js' -OutputFile $script:dashboardOutputFile

        Start-Sleep -Milliseconds 600

        $script:botProcess = Start-ManagedProcess -Name 'Bot' -ScriptName 'index.js' -OutputFile $script:botOutputFile
    }
    catch {
        $message = "Launcher start failed: $($_.Exception.Message)"
        Add-Log $message
        [System.Windows.Forms.MessageBox]::Show($message, 'Launcher Error', 'OK', 'Error') | Out-Null
        Stop-App
    }
}

function Stop-App {
    try {
        Stop-ManagedProcess -Process $script:botProcess -Name 'Bot'
        $script:botProcess = $null

        Stop-ManagedProcess -Process $script:dashboardProcess -Name 'Dashboard'
        $script:dashboardProcess = $null
        $script:dashboardOpened = $false

        Set-RunningState -IsRunning $false
        Update-Status -Text 'Stopped' -Color ([System.Drawing.Color]::IndianRed)
    }
    catch {
        Add-Log "Stop failed: $($_.Exception.Message)"
    }
}

Initialize-SingleInstance

$form = New-Object System.Windows.Forms.Form
$form.Text = 'Media Prestige Control Suite'
$form.Size = New-Object System.Drawing.Size(1220, 820)
$form.MinimumSize = New-Object System.Drawing.Size(1180, 800)
$form.StartPosition = 'CenterScreen'
$form.BackColor = [System.Drawing.Color]::FromArgb(13, 13, 15)
$form.ForeColor = [System.Drawing.Color]::White
$form.Font = New-Object System.Drawing.Font('Segoe UI', 10)

$heroPanel = New-Object System.Windows.Forms.Panel
$heroPanel.Location = New-Object System.Drawing.Point(24, 18)
$heroPanel.Size = New-Object System.Drawing.Size(1152, 178)
$heroPanel.BackColor = [System.Drawing.Color]::FromArgb(22, 22, 26)
$form.Controls.Add($heroPanel)

$heroAccent = New-Object System.Windows.Forms.Panel
$heroAccent.Location = New-Object System.Drawing.Point(0, 0)
$heroAccent.Size = New-Object System.Drawing.Size(1152, 4)
$heroAccent.BackColor = [System.Drawing.Color]::FromArgb(199, 168, 106)
$heroPanel.Controls.Add($heroAccent)

$eyebrowLabel = New-Object System.Windows.Forms.Label
$eyebrowLabel.Text = 'MEDIA PRESTIGE'
$eyebrowLabel.Font = New-Object System.Drawing.Font('Segoe UI Semibold', 10)
$eyebrowLabel.ForeColor = [System.Drawing.Color]::FromArgb(199, 168, 106)
$eyebrowLabel.AutoSize = $true
$eyebrowLabel.Location = New-Object System.Drawing.Point(32, 22)
$heroPanel.Controls.Add($eyebrowLabel)

$titleLabel = New-Object System.Windows.Forms.Label
$titleLabel.Text = 'Luxury Client Control Suite'
$titleLabel.Font = New-Object System.Drawing.Font('Georgia', 26, [System.Drawing.FontStyle]::Bold)
$titleLabel.ForeColor = [System.Drawing.Color]::FromArgb(244, 238, 229)
$titleLabel.AutoSize = $true
$titleLabel.Location = New-Object System.Drawing.Point(30, 46)
$heroPanel.Controls.Add($titleLabel)

$subtitleLabel = New-Object System.Windows.Forms.Label
$subtitleLabel.Text = 'A premium desktop launcher for your WhatsApp bot and client dashboard.'
$subtitleLabel.Font = New-Object System.Drawing.Font('Segoe UI', 11)
$subtitleLabel.ForeColor = [System.Drawing.Color]::FromArgb(186, 181, 171)
$subtitleLabel.AutoSize = $true
$subtitleLabel.Location = New-Object System.Drawing.Point(34, 96)
$heroPanel.Controls.Add($subtitleLabel)

$descriptionLabel = New-Object System.Windows.Forms.Label
$descriptionLabel.Text = 'Start operations, monitor live output, and open the dashboard from a cleaner high-end interface designed to feel presentable in front of luxury clients.'
$descriptionLabel.Font = New-Object System.Drawing.Font('Segoe UI', 10)
$descriptionLabel.ForeColor = [System.Drawing.Color]::FromArgb(154, 151, 144)
$descriptionLabel.MaximumSize = New-Object System.Drawing.Size(720, 0)
$descriptionLabel.AutoSize = $true
$descriptionLabel.Location = New-Object System.Drawing.Point(34, 122)
$heroPanel.Controls.Add($descriptionLabel)

$statusCard = New-Object System.Windows.Forms.Panel
$statusCard.Location = New-Object System.Drawing.Point(876, 24)
$statusCard.Size = New-Object System.Drawing.Size(244, 126)
$statusCard.BackColor = [System.Drawing.Color]::FromArgb(29, 29, 34)
$heroPanel.Controls.Add($statusCard)

$statusCardTitle = New-Object System.Windows.Forms.Label
$statusCardTitle.Text = 'System Status'
$statusCardTitle.Font = New-Object System.Drawing.Font('Segoe UI', 10)
$statusCardTitle.ForeColor = [System.Drawing.Color]::FromArgb(169, 164, 154)
$statusCardTitle.AutoSize = $true
$statusCardTitle.Location = New-Object System.Drawing.Point(18, 18)
$statusCard.Controls.Add($statusCardTitle)

$statusLabel = New-Object System.Windows.Forms.Label
$statusLabel.Text = 'Stopped'
$statusLabel.AutoSize = $true
$statusLabel.Font = New-Object System.Drawing.Font('Segoe UI Semibold', 18)
$statusLabel.ForeColor = [System.Drawing.Color]::IndianRed
$statusLabel.Location = New-Object System.Drawing.Point(18, 46)
$statusCard.Controls.Add($statusLabel)

$statusHint = New-Object System.Windows.Forms.Label
$statusHint.Text = 'Waiting for launch'
$statusHint.AutoSize = $true
$statusHint.Font = New-Object System.Drawing.Font('Segoe UI', 9)
$statusHint.ForeColor = [System.Drawing.Color]::FromArgb(150, 150, 150)
$statusHint.Location = New-Object System.Drawing.Point(20, 84)
$statusCard.Controls.Add($statusHint)

$controlsPanel = New-Object System.Windows.Forms.Panel
$controlsPanel.Location = New-Object System.Drawing.Point(24, 214)
$controlsPanel.Size = New-Object System.Drawing.Size(1152, 126)
$controlsPanel.BackColor = [System.Drawing.Color]::FromArgb(20, 20, 24)
$form.Controls.Add($controlsPanel)

$controlsTitle = New-Object System.Windows.Forms.Label
$controlsTitle.Text = 'Launch Controls'
$controlsTitle.Font = New-Object System.Drawing.Font('Georgia', 15, [System.Drawing.FontStyle]::Bold)
$controlsTitle.ForeColor = [System.Drawing.Color]::FromArgb(240, 232, 220)
$controlsTitle.AutoSize = $true
$controlsTitle.Location = New-Object System.Drawing.Point(24, 18)
$controlsPanel.Controls.Add($controlsTitle)

$controlsSubTitle = New-Object System.Windows.Forms.Label
$controlsSubTitle.Text = 'Start the full experience or jump directly to the dashboard.'
$controlsSubTitle.Font = New-Object System.Drawing.Font('Segoe UI', 9)
$controlsSubTitle.ForeColor = [System.Drawing.Color]::FromArgb(162, 158, 150)
$controlsSubTitle.AutoSize = $true
$controlsSubTitle.Location = New-Object System.Drawing.Point(26, 46)
$controlsPanel.Controls.Add($controlsSubTitle)

$startButton = New-Object System.Windows.Forms.Button
$startButton.Text = 'Start Bot + Dashboard'
$startButton.Size = New-Object System.Drawing.Size(240, 44)
$startButton.Location = New-Object System.Drawing.Point(26, 70)
Style-Button -Button $startButton -BackColor ([System.Drawing.Color]::FromArgb(199, 168, 106)) -ForeColor ([System.Drawing.Color]::FromArgb(18, 18, 18))
$controlsPanel.Controls.Add($startButton)

$stopButton = New-Object System.Windows.Forms.Button
$stopButton.Text = 'Stop'
$stopButton.Size = New-Object System.Drawing.Size(120, 44)
$stopButton.Location = New-Object System.Drawing.Point(278, 70)
$stopButton.Enabled = $false
Style-Button -Button $stopButton -BackColor ([System.Drawing.Color]::FromArgb(54, 54, 54)) -ForeColor ([System.Drawing.Color]::White)
$controlsPanel.Controls.Add($stopButton)

$dashboardButton = New-Object System.Windows.Forms.Button
$dashboardButton.Text = 'Open Dashboard'
$dashboardButton.Size = New-Object System.Drawing.Size(168, 44)
$dashboardButton.Location = New-Object System.Drawing.Point(412, 70)
Style-Button -Button $dashboardButton -BackColor ([System.Drawing.Color]::FromArgb(36, 36, 42)) -ForeColor ([System.Drawing.Color]::FromArgb(242, 233, 221))
$controlsPanel.Controls.Add($dashboardButton)

$folderButton = New-Object System.Windows.Forms.Button
$folderButton.Text = 'Open Folder'
$folderButton.Size = New-Object System.Drawing.Size(152, 44)
$folderButton.Location = New-Object System.Drawing.Point(594, 70)
Style-Button -Button $folderButton -BackColor ([System.Drawing.Color]::FromArgb(36, 36, 42)) -ForeColor ([System.Drawing.Color]::FromArgb(242, 233, 221))
$controlsPanel.Controls.Add($folderButton)

$infoCard = New-Object System.Windows.Forms.Panel
$infoCard.Location = New-Object System.Drawing.Point(782, 18)
$infoCard.Size = New-Object System.Drawing.Size(338, 92)
$infoCard.BackColor = [System.Drawing.Color]::FromArgb(28, 28, 32)
$controlsPanel.Controls.Add($infoCard)

$hintLabel = New-Object System.Windows.Forms.Label
$hintLabel.Text = 'Client Note'
$hintLabel.AutoSize = $true
$hintLabel.Font = New-Object System.Drawing.Font('Segoe UI Semibold', 10)
$hintLabel.ForeColor = [System.Drawing.Color]::FromArgb(199, 168, 106)
$hintLabel.Location = New-Object System.Drawing.Point(16, 14)
$infoCard.Controls.Add($hintLabel)

$hintBodyLabel = New-Object System.Windows.Forms.Label
$hintBodyLabel.Text = 'If WhatsApp needs a QR scan, it will show in the live console below.'
$hintBodyLabel.AutoSize = $true
$hintBodyLabel.MaximumSize = New-Object System.Drawing.Size(300, 0)
$hintBodyLabel.Font = New-Object System.Drawing.Font('Segoe UI', 9)
$hintBodyLabel.ForeColor = [System.Drawing.Color]::FromArgb(206, 202, 194)
$hintBodyLabel.Location = New-Object System.Drawing.Point(16, 38)
$infoCard.Controls.Add($hintBodyLabel)

$consolePanel = New-Object System.Windows.Forms.Panel
$consolePanel.Location = New-Object System.Drawing.Point(24, 358)
$consolePanel.Size = New-Object System.Drawing.Size(1152, 382)
$consolePanel.BackColor = [System.Drawing.Color]::FromArgb(18, 18, 20)
$form.Controls.Add($consolePanel)

$consoleTitle = New-Object System.Windows.Forms.Label
$consoleTitle.Text = 'Operations Console'
$consoleTitle.AutoSize = $true
$consoleTitle.Font = New-Object System.Drawing.Font('Georgia', 15, [System.Drawing.FontStyle]::Bold)
$consoleTitle.ForeColor = [System.Drawing.Color]::FromArgb(240, 232, 220)
$consoleTitle.Location = New-Object System.Drawing.Point(24, 16)
$consolePanel.Controls.Add($consoleTitle)

$consoleSubTitle = New-Object System.Windows.Forms.Label
$consoleSubTitle.Text = 'Live output from the dashboard and WhatsApp bot.'
$consoleSubTitle.AutoSize = $true
$consoleSubTitle.Font = New-Object System.Drawing.Font('Segoe UI', 9)
$consoleSubTitle.ForeColor = [System.Drawing.Color]::FromArgb(160, 160, 160)
$consoleSubTitle.Location = New-Object System.Drawing.Point(26, 44)
$consolePanel.Controls.Add($consoleSubTitle)

$logBox = New-Object System.Windows.Forms.TextBox
$logBox.Location = New-Object System.Drawing.Point(26, 74)
$logBox.Size = New-Object System.Drawing.Size(1100, 284)
$logBox.Multiline = $true
$logBox.ScrollBars = 'Vertical'
$logBox.ReadOnly = $true
$logBox.BorderStyle = 'None'
$logBox.BackColor = [System.Drawing.Color]::FromArgb(10, 10, 12)
$logBox.ForeColor = [System.Drawing.Color]::FromArgb(228, 219, 205)
$logBox.Font = New-Object System.Drawing.Font('Consolas', 10)
$consolePanel.Controls.Add($logBox)

$footerLabel = New-Object System.Windows.Forms.Label
$footerLabel.Text = 'Premium launcher active. Create a shortcut to "Launch Media Prestige GUI.bat" for a polished one-click start.'
$footerLabel.AutoSize = $true
$footerLabel.Font = New-Object System.Drawing.Font('Segoe UI', 9)
$footerLabel.ForeColor = [System.Drawing.Color]::FromArgb(145, 145, 145)
$footerLabel.Location = New-Object System.Drawing.Point(28, 748)
$form.Controls.Add($footerLabel)

$logTimer = New-Object System.Windows.Forms.Timer
$logTimer.Interval = 700
$logTimer.Add_Tick({
    try {
        Read-NewLogLines -FilePath $script:dashboardOutputFile -Offset ([ref]$script:dashboardReadOffset) -Prefix 'Dashboard: '
        Read-NewLogLines -FilePath $script:botOutputFile -Offset ([ref]$script:botReadOffset) -Prefix 'Bot: '
    }
    catch {
        Write-CrashLog "Log timer error: $($_.Exception.Message)"
    }
})
$logTimer.Start()

$startButton.Add_Click({
    try {
        Start-App
    }
    catch {
        $message = "Unexpected error while starting: $($_.Exception.Message)"
        Add-Log $message
        [System.Windows.Forms.MessageBox]::Show($message, 'Launcher Error', 'OK', 'Error') | Out-Null
    }
})
$stopButton.Add_Click({
    try {
        Stop-App
    }
    catch {
        Add-Log "Unexpected stop error: $($_.Exception.Message)"
    }
})
$dashboardButton.Add_Click({
    try {
        Open-Dashboard
    }
    catch {
        Add-Log "Could not open dashboard: $($_.Exception.Message)"
    }
})
$folderButton.Add_Click({
    try {
        Start-Process $script:projectRoot
    }
    catch {
        Add-Log "Could not open folder: $($_.Exception.Message)"
    }
})
$form.Add_FormClosing({
    try {
        $logTimer.Stop()
        Stop-App
    }
    catch {
        Write-CrashLog "Form closing error: $($_.Exception.Message)"
    }
    finally {
        Release-SingleInstance
    }
})

Add-Log 'Launcher ready. Click "Start Bot + Dashboard" to run the app.'
[void]$form.ShowDialog()
