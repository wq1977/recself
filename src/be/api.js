let currentPath;
const api = {
  versions() {
    return process.versions;
  },
  async editor(event, path) {
    const stat = require("fs").statSync(path);
    if (stat.size > 125 * 1024) {
      currentPath = null;
      return "Too big to open";
    }
    currentPath = path;
    return require("fs").readFileSync(path).toString();
  },
  async save(event, cnt) {
    if (!currentPath) return;
    require("fs").writeFileSync(currentPath, cnt);
  },
};

export default api;
