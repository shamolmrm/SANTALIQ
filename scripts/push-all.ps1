# Push the current branch to both GitHub accounts.
#   origin -> github.com/shamolbro/SANTALIQ
#   mirror -> github.com/shamolmrm/SANTALIQ
# Usage: .\scripts\push-all.ps1
$ErrorActionPreference = "Stop"
$branch = git rev-parse --abbrev-ref HEAD

git push origin $branch

gh auth switch --user shamolmrm | Out-Null
try {
    git push mirror $branch
} finally {
    gh auth switch --user shamolbro | Out-Null
}
Write-Host "Pushed '$branch' to origin and mirror."
