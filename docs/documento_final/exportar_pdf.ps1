# Exporta el .docx final a PDF con Word. Es el paso que va DESPUÉS de
# finalizar_con_word.ps1, en otra ejecución: exportar con el Word de ese paso
# todavía cerrándose dejaba la exportación trabada (05/11/2026).
#   powershell -ExecutionPolicy Bypass -File docs/documento_final/exportar_pdf.ps1
# Si aun así se traba, cierre WINWORD en el Administrador de tareas y reintente.
param([string]$Nombre = 'Examen_Parcial_2_Grupo43_SW1')
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
Get-ChildItem -LiteralPath $dir -Filter '~$*' -Force | Remove-Item -Force -ErrorAction SilentlyContinue
$t0 = Get-Date
$word = New-Object -ComObject Word.Application
$word.Visible = $true
$word.DisplayAlerts = 0
try {
    # Open(FileName, ConfirmConversions, ReadOnly, AddToRecentFiles)
    $doc = $word.Documents.Open("$dir\$Nombre.docx", $false, $true, $false)
    "Abierto en $([int]((Get-Date) - $t0).TotalSeconds) s"
    $doc.ExportAsFixedFormat("$dir\$Nombre.pdf", 17)  # wdExportFormatPDF
    "PDF en $([int]((Get-Date) - $t0).TotalSeconds) s, paginas: $($doc.ComputeStatistics(2))"
    $doc.Close(0)
}
finally {
    $word.Quit()
}
