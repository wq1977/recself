const api = {
  versions() {
    return process.versions;
  },
  async editor(event, path) {
    return require("fs").readFileSync(path).toString();
  },
};

export default api;
