$pdfPath = "js/pdf.js"
$content = Get-Content -Raw $pdfPath -Encoding UTF8

# 1. Update ROWS_PER_PAGE from 12 to 20
$content = $content.Replace("paperSize === 'custom' ? 12 : 25", "paperSize === 'custom' ? 20 : 25")

# 2. Patch generatePdfReport rendering loop
$oldSingleRow = '            const chitPill = memberHasTakenChit\s*\? `<span style="background-color: #f3e8ff; color: #4c1d95; padding: 4px 10px; border-radius: 99px; font-size: 14.5px; font-weight: 900;">\$\{chitAmountStr\} \/ \$\{chitModeStr\}</span>`\s*: ``;\s*chunkRowsHtml \+= `\s*<tr style="background-color: \$\{rowBg\};">\s*<td style="padding: 10px 4px; color: #111827; font-size: 11.5px; font-weight: 700; text-align: center; border: 1px solid #475569;">\$\{index \+ 1\}</td>\s*<td style="padding: 10px 4px; color: #000000; font-weight: 900; font-size: 14.5px; text-align: left; text-transform: uppercase; word-break: break-word; white-space: normal; border: 1px solid #475569;">\$\{member\.name\}</td>\s*<td style="padding: 10px 4px; color: #334155; font-size: 10.5px; font-weight: 700; text-align: center; border: 1px solid #475569;">\$\{group\.name\}</td>\s*<td style="padding: 10px 4px; text-align: center; border: 1px solid #475569;">\s*<span style="border: 1px solid #94a3b8; background: #ffffff; padding: 4px 10px; border-radius: 99px; font-size: 11px; font-weight: 800; color: #111827;">\$\{schemeName\}</span>\s*</td>\s*<td style="padding: 10px 4px; color: #9a3412; font-size: 13px; font-weight: 900; text-align: center; border: 1px solid #475569;">\$\{monthNum\}</td>'

$newSingleRow = '            let nameStyle = `padding: 10px 4px; color: #000000; font-weight: 900; font-size: 14.5px; text-align: left; text-transform: uppercase; word-break: break-word; white-space: normal; border: 1px solid #475569;`;
            let groupStyle = `padding: 10px 4px; color: #334155; font-size: 10.5px; font-weight: 700; text-align: center; border: 1px solid #475569;`;
            let monthStyle = `padding: 10px 4px; color: #9a3412; font-size: 13px; font-weight: 900; text-align: center; border: 1px solid #475569;`;
            let chitPillText = `${chitAmountStr} / ${chitModeStr}`;
            
            if (paperSize === ''custom'') {
                nameStyle = `padding: 10px 4px; color: #000000; font-weight: 900; font-size: 17px; text-align: left; text-transform: uppercase; word-break: break-word; white-space: normal; border: 1px solid #475569;`;
                groupStyle = `padding: 10px 4px; color: #000000; font-size: 11.5px; font-weight: 900; text-align: center; border: 1px solid #475569;`;
                monthStyle = `padding: 10px 4px; color: #000000; font-size: 15px; font-weight: 900; text-align: center; border: 1px solid #475569;`;
                chitPillText = `${chitAmountStr} / ${monthNum} m`;
            }

            const chitPill = memberHasTakenChit
                ? `<span style="background-color: #f3e8ff; color: #4c1d95; padding: 4px 10px; border-radius: 99px; font-size: 14.5px; font-weight: 900;">${chitPillText}</span>`
                : ``;

            chunkRowsHtml += `
                <tr style="background-color: ${rowBg};">
                    <td style="padding: 10px 4px; color: #111827; font-size: 11.5px; font-weight: 700; text-align: center; border: 1px solid #475569;">${index + 1}</td>
                    <td style="${nameStyle}">${member.name}</td>
                    <td style="${groupStyle}">${group.name}</td>
                    <td style="padding: 10px 4px; text-align: center; border: 1px solid #475569;">
                        <span style="border: 1px solid #94a3b8; background: #ffffff; padding: 4px 10px; border-radius: 99px; font-size: 11px; font-weight: 800; color: #111827;">${schemeName}</span>
                    </td>
                    <td style="${monthStyle}">${monthNum}</td>'

$content = [System.Text.RegularExpressions.Regex]::Replace($content, $oldSingleRow, $newSingleRow)


# 3. Patch generateGlobalPdfReport rendering loop
$oldGlobalRow = '            const chitPill = row\.hasTakenChit\s*\? `<span style="background-color: #f3e8ff; color: #4c1d95; padding: 4px 10px; border-radius: 99px; font-size: 14.5px; font-weight: 900;">\$\{row\.chitTakenDisplay\}</span>`\s*: ``;\s*chunkRowsHtml \+= `\s*<tr style="background-color: \$\{rowBg\};">\s*<td style="padding: 10px 4px; color: #111827; font-size: 11.5px; font-weight: 700; text-align: center; border: 1px solid #475569;">\$\{index \+ 1\}</td>\s*<td style="padding: 10px 4px; color: #000000; font-weight: 900; font-size: 14.5px; text-align: left; text-transform: uppercase; word-break: break-word; white-space: normal; border: 1px solid #475569;">\$\{row\.name\}</td>\s*<td style="padding: 10px 4px; color: #334155; font-size: 10.5px; font-weight: 700; text-align: center; border: 1px solid #475569;">\$\{row\.groupName\}</td>\s*<td style="padding: 10px 4px; text-align: center; border: 1px solid #475569;">\s*<span style="border: 1px solid #94a3b8; background: #ffffff; padding: 4px 10px; border-radius: 99px; font-size: 11px; font-weight: 800; color: #111827;">\$\{row\.scheme\}</span>\s*</td>\s*<td style="padding: 10px 4px; color: #9a3412; font-size: 13px; font-weight: 900; text-align: center; border: 1px solid #475569;">\$\{row\.monthNo\}</td>'

$newGlobalRow = '            let nameStyle = `padding: 10px 4px; color: #000000; font-weight: 900; font-size: 14.5px; text-align: left; text-transform: uppercase; word-break: break-word; white-space: normal; border: 1px solid #475569;`;
            let groupStyle = `padding: 10px 4px; color: #334155; font-size: 10.5px; font-weight: 700; text-align: center; border: 1px solid #475569;`;
            let monthStyle = `padding: 10px 4px; color: #9a3412; font-size: 13px; font-weight: 900; text-align: center; border: 1px solid #475569;`;
            let chitPillText = row.chitTakenDisplay;
            
            if (paperSize === ''custom'') {
                nameStyle = `padding: 10px 4px; color: #000000; font-weight: 900; font-size: 17px; text-align: left; text-transform: uppercase; word-break: break-word; white-space: normal; border: 1px solid #475569;`;
                groupStyle = `padding: 10px 4px; color: #000000; font-size: 11.5px; font-weight: 900; text-align: center; border: 1px solid #475569;`;
                monthStyle = `padding: 10px 4px; color: #000000; font-size: 15px; font-weight: 900; text-align: center; border: 1px solid #475569;`;
                if (row.hasTakenChit) {
                    let chitAmtStr = row.chitTakenDisplay.split('' / '')[0];
                    chitPillText = `${chitAmtStr} / ${row.monthNo} m`;
                }
            }

            const chitPill = row.hasTakenChit
                ? `<span style="background-color: #f3e8ff; color: #4c1d95; padding: 4px 10px; border-radius: 99px; font-size: 14.5px; font-weight: 900;">${chitPillText}</span>`
                : ``;

            chunkRowsHtml += `
                <tr style="background-color: ${rowBg};">
                    <td style="padding: 10px 4px; color: #111827; font-size: 11.5px; font-weight: 700; text-align: center; border: 1px solid #475569;">${index + 1}</td>
                    <td style="${nameStyle}">${row.name}</td>
                    <td style="${groupStyle}">${row.groupName}</td>
                    <td style="padding: 10px 4px; text-align: center; border: 1px solid #475569;">
                        <span style="border: 1px solid #94a3b8; background: #ffffff; padding: 4px 10px; border-radius: 99px; font-size: 11px; font-weight: 800; color: #111827;">${row.scheme}</span>
                    </td>
                    <td style="${monthStyle}">${row.monthNo}</td>'

$content = [System.Text.RegularExpressions.Regex]::Replace($content, $oldGlobalRow, $newGlobalRow)

Set-Content -Path $pdfPath -Value $content -Encoding UTF8
Write-Output "Patched custom paper size styles"
