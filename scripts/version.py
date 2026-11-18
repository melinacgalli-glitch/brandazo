# Sube la versión del sitio en los tres lugares: VERSION, los ?v= de index.html y public/version.json
# (este último lo consulta la app para avisar «Hay una versión nueva»). Uso: python3 scripts/version.py 0.8.3
import re, sys, json, pathlib
v = sys.argv[1]; assert re.fullmatch(r"\d+\.\d+\.\d+", v), "formato: 0.8.3"
root = pathlib.Path(__file__).resolve().parent.parent
(root / "VERSION").write_text(v + "\n")
idx = root / "public" / "index.html"; s = idx.read_text()
s = re.sub(r"(js/[\w-]+\.js|css/[\w-]+\.css)\?v=[\d.]+", lambda m: m.group(1) + "?v=" + v, s); idx.write_text(s)
(root / "public" / "version.json").write_text(json.dumps({"v": v}) + "\n")
print("versión", v)
