$appJs = Get-Content app.js -Raw

$regex1 = "if \(\!localStorage.getItem\('pwaPromptDeclined'\)\) \{ pwaPopup\.style\.display = 'flex';\s*setTimeout\(\(\) => pwaPopup\.classList\.add\('show'\), 50\);\s*\}\s*\}\);\s*\}\s*\}\);"
$fixed1 = "localStorage.removeItem('pwaPromptDeclined');
              pwaPopup.style.display = 'flex';
              setTimeout(() => pwaPopup.classList.add('show'), 50);
          }
      });"

$appJs = $appJs -replace $regex1, $fixed1

$regex2 = "if \(pwaPopup\) \{\s*pwaPopup\.style\.display = 'flex';\s*setTimeout\(\(\) => pwaPopup\.classList\.add\('show'\), 50\);\s*\}\s*\}\);\s*\}\s*\}\);\s*\}"
$fixed2 = "if (pwaPopup) {
                  pwaPopup.style.display = 'flex';
                  setTimeout(() => pwaPopup.classList.add('show'), 50);
              }
          });
      }"

$appJs = $appJs -replace $regex2, $fixed2

Set-Content app.js -Value $appJs -Encoding utf8
