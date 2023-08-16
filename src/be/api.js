const fs = require("fs");
const path = require("path");

function walk(directoryPath, indent = 0, result = []) {
  const files = fs.readdirSync(directoryPath);
  files.forEach((file) => {
    const filePath = path.join(directoryPath, file);
    const item = { id: filePath, label: file, indent };
    result.push(item);
    const stats = fs.statSync(filePath);
    const isDirectory = stats.isDirectory();
    if (isDirectory) {
      item.nodes = [];
      walk(filePath, indent + 2, item.nodes);
    }
  });
  result.sort((a, b) => {
    const av = a.nodes ? -10000 : 0;
    const bv = b.nodes ? -10000 : 0;
    return av - bv + a.label.localeCompare(b.label);
  });
  return result;
}
const api = {
  versions() {
    return process.versions;
  },
  async listDir() {
    const list = walk(".");
    return list;
  },
  async editor(event, path) {
    return require("fs").readFileSync(path).toString();
  },
};

export default api;
