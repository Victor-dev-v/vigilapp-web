# Caminho do arquivo unificado
$arquivoEntrada = "C:\Users\User\Desktop\vigilAPP\IAPROGRAMMING\arquivos_unificados.txt"

# Diretório raiz do projeto onde os arquivos serão sobrescritos
$diretorioProjeto = "C:\Users\User\Desktop\vigilAPP"

if (-Not (Test-Path $arquivoEntrada)) {
    Write-Error "Arquivo unificado não encontrado em: $arquivoEntrada"
    exit
}

$texto = Get-Content -Raw -Path $arquivoEntrada

# Regex para capturar blocos de arquivos com conteúdo, incluindo múltiplas linhas
$pattern = '(?s)--- ARQUIVO: (.+?) ---\r?\n(.*?)\r?\n--- FIM ARQUIVO: .+? ---'

$matches = [regex]::Matches($texto, $pattern)

if ($matches.Count -eq 0) {
    Write-Warning "Nenhum arquivo encontrado no arquivo unificado."
    exit
}

foreach ($match in $matches) {
    $caminhoRelativo = $match.Groups[1].Value.Trim()
    $conteudo = $match.Groups[2].Value

    $caminhoCompleto = Join-Path $diretorioProjeto $caminhoRelativo
    $diretorioDoArquivo = Split-Path $caminhoCompleto

    if (-Not (Test-Path $diretorioDoArquivo)) {
        New-Item -ItemType Directory -Path $diretorioDoArquivo -Force | Out-Null
        Write-Host "Criado diretório: $diretorioDoArquivo"
    }

    if (![string]::IsNullOrEmpty($conteudo)) {
        # Converte para bytes com encoding ISO-8859-1 e depois para string UTF8 para corrigir caracteres estranhos
        $bytes = [System.Text.Encoding]::GetEncoding("ISO-8859-1").GetBytes($conteudo)
        $conteudoCorrigido = [System.Text.Encoding]::UTF8.GetString($bytes)
    }
    else {
        $conteudoCorrigido = ""
    }

    Set-Content -Path $caminhoCompleto -Value $conteudoCorrigido -Encoding UTF8
    Write-Host "Arquivo escrito: $caminhoRelativo"
}

Write-Host "Processo concluído! Todos os arquivos foram reconstruídos com sucesso, sem BOM."
