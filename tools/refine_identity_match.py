from pathlib import Path
p=Path('assets/screening-system-v2.js')
s=p.read_text(encoding='utf-8')
old="  if(/nome\\s+completo|full\\s*name|patient\\s*name|paciente/.test(text))return 'name';"
new="  if(/nome\\s+completo|full\\s*name|patient\\s*name|nome\\s+do\\s+paciente/.test(text)||/^(paciente|patientname|fullname|fullName|nome|name)$/i.test(String(el.id||'')))return 'name';"
if old not in s: raise SystemExit('name matching anchor missing')
s=s.replace(old,new,1)
p.write_text(s,encoding='utf-8')
print('REFINE_IDENTITY_MATCH_OK')
