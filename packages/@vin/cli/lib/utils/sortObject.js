
const sortObject = (obj, reset, dontSortByUnicode) => {
  if (!obj) {
    return;
  }
  const res = {};

  if (reset && reset.length > 0) {
    reset.forEach(key => {
      res[key] = obj[key];
      delete obj[key];
    })
  }

  const keys = Object.keys(obj);

  !dontSortByUnicode && keys.sort();

  keys.forEach(k => {
    res[k] = obj[k]
  })

  return res;
}
module.exports = sortObject;