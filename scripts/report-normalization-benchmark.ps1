param(
    [Parameter(Mandatory = $true)][string]$AssemblyPath,
    [string]$DependencyPath = 'C:/dotnet/Carmen4/Carmen.WebApi/bin',
    [int]$Rows = 5000
)
$ErrorActionPreference = 'Stop'
# Run in a fresh Windows PowerShell process for each build to avoid assembly reuse.
# Synthetic inputs only; no connection, credential, or financial transaction access.
Add-Type -TypeDefinition @'
public static class ReportBenchmarkDependencies {
    public static void Register(string directory) {
        System.AppDomain.CurrentDomain.AssemblyResolve += delegate(object sender, System.ResolveEventArgs args) {
            string path = System.IO.Path.Combine(directory, new System.Reflection.AssemblyName(args.Name).Name + ".dll");
            return System.IO.File.Exists(path) ? System.Reflection.Assembly.LoadFrom(path) : null;
        };
    }
}
'@
[ReportBenchmarkDependencies]::Register($DependencyPath)
$assembly = [Reflection.Assembly]::LoadFrom((Resolve-Path -LiteralPath $AssemblyPath).Path)
$type = $assembly.GetType('Carmen.WebApi.Functions.FncReportV2', $true)
$flags = [Reflection.BindingFlags]'NonPublic,Static'
$monthly = $type.GetMethod('NormalizeFinancialRow', $flags)
$daily = $type.GetMethod('NormalizeDailyFinancialRow', $flags)
$rangeType = $type.GetNestedType('ReportPeriodRange', [Reflection.BindingFlags]::NonPublic)
$ranges = [Activator]::CreateInstance([Collections.Generic.List``1].MakeGenericType($rangeType))
$range = [Activator]::CreateInstance($rangeType, $true)
$range.PeriodYear = 2026; $range.Period = 9
$range.Start = [datetime]'2026-09-01'; $range.End = [datetime]'2026-09-30'
$ranges.Add($range)
$definitions = [Collections.Generic.List[Collections.Generic.KeyValuePair[string,string]]]::new()
$definitions.Add([Collections.Generic.KeyValuePair[string,string]]::new('segment', 'Market Segment'))
$days = [Collections.Generic.Dictionary[string,int]]::new(); $days['2026:9'] = 30
$projection = @('JvhDate','JvdBAmt','DeptCode','AccCode','AccNature','TransDrCr','Dim')
$fixtureResults = [Collections.Generic.List[string]]::new()
foreach ($variant in @('normal','negative','null','bad-dimension','case-and-alias','duplicate-case')) {
    $row = [Collections.Generic.Dictionary[string,object]]::new()
    $row['PeriodYear'] = 2026; $row['DeptCode'] = '101'; $row['AccCode'] = '4001'
    $row['AccNature'] = 'C'; $row['JvhDate'] = '2026-09-30'; $row['TransDrCr'] = 'C'
    $row['JvdBAmt'] = [decimal]123.45; $row['Dim'] = '{"segment":"FIT"}'
    for ($i=1; $i -le 12; $i++) {
        foreach ($field in @('Amt','BfAmt','Dr','Cr')) { $row[$field+$i] = [decimal]123.45 }
    }
    for ($i=1; $i -le 100; $i++) { $row['Unused'+$i] = 'unused' }
    if ($variant -eq 'negative') { $row['TransDrCr']='D'; $row['Amt9']=[decimal]-123.45 }
    if ($variant -eq 'null') { $row['JvdBAmt']=$null; $row['Amt9']=$null; $row['Dim']=$null }
    if ($variant -eq 'bad-dimension') { $row['Dim']='invalid json' }
    if ($variant -eq 'case-and-alias') {
        $row.Remove('PeriodYear') | Out-Null; $row['anniversary']=2026
        $row.Remove('DeptCode') | Out-Null; $row['deptcode']='101'
    }
    if ($variant -eq 'duplicate-case') { $row['deptcode']='999' }
    foreach ($budget in @($false,$true)) {
        $normalized = $monthly.Invoke($null, [object[]]@($row,$budget,$definitions,$days))
        if (-not $budget) {
            # Actual Dr/Cr fields are intentionally omitted; compare every retained field.
            for ($i=1; $i -le 12; $i++) {
                $normalized.Remove('dr'+$i) | Out-Null
                $normalized.Remove('cr'+$i) | Out-Null
            }
            if ($variant -in @('normal','negative','null','bad-dimension')) {
                $monthlySelected = [Collections.Generic.Dictionary[string,object]]::new()
                foreach ($field in @('PeriodYear','GlpNo','DeptCode','AccCode','AccNature','AccType')) {
                    if ($row.ContainsKey($field)) { $monthlySelected[$field]=$row[$field] }
                }
                for ($i=1; $i -le 12; $i++) {
                    foreach ($field in @('Amt','BfAmt')) { $monthlySelected[$field+$i]=$row[$field+$i] }
                }
                # VGlHis has no Dim column; test its actual view contract.
                $historyRow = [Collections.Generic.Dictionary[string,object]]::new($row)
                $historyRow.Remove('Dim') | Out-Null
                $historyFull = $monthly.Invoke($null, [object[]]@($historyRow,$false,$definitions,$days))
                $historyProjected = $monthly.Invoke($null, [object[]]@($monthlySelected,$false,$definitions,$days))
                for ($i=1; $i -le 12; $i++) {
                    $historyFull.Remove('dr'+$i) | Out-Null; $historyFull.Remove('cr'+$i) | Out-Null
                    $historyProjected.Remove('dr'+$i) | Out-Null; $historyProjected.Remove('cr'+$i) | Out-Null
                }
                if ($historyFull.ToString() -cne $historyProjected.ToString()) { throw "Monthly projection changed fixture $variant" }
            }
        }
        $fixtureResults.Add($normalized.ToString())
    }
    $full = $daily.Invoke($null, [object[]]@($row,$ranges,$definitions))
    $selected = [Collections.Generic.Dictionary[string,object]]::new()
    foreach ($entry in $row.GetEnumerator()) {
        if ($projection -icontains $entry.Key) { $selected[$entry.Key]=$entry.Value }
    }
    $projected = $daily.Invoke($null, [object[]]@($selected,$ranges,$definitions))
    if ($full.ToString() -cne $projected.ToString()) { throw "Projection changed fixture $variant" }
    $fixtureResults.Add($full.ToString())
}
$argsForBenchmark = [object[]]@($row,$false,$definitions,$days)
$null = $monthly.Invoke($null,$argsForBenchmark)
$samples = @()
for ($sample=0; $sample -lt 5; $sample++) {
    $watch = [Diagnostics.Stopwatch]::StartNew()
    for ($i=0; $i -lt $Rows; $i++) { $null = $monthly.Invoke($null,$argsForBenchmark) }
    $watch.Stop(); $samples += [math]::Round($watch.Elapsed.TotalMilliseconds,2)
}
$hash = [Security.Cryptography.SHA256]::Create().ComputeHash([Text.Encoding]::UTF8.GetBytes(($fixtureResults -join "`n")))
[pscustomobject]@{
    fixtureCount=$fixtureResults.Count; projection='pass'; monthlyProjection='pass'; rowsPerSample=$Rows
    normalizationSamplesMs=$samples; fixtureHash=[BitConverter]::ToString($hash).Replace('-','')
} | ConvertTo-Json -Compress
