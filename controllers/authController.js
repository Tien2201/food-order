const Food = require("../models/Food");

const getFoods = async (req, res) => {
  const foods = await Food.find();

  res.render("index", {
    foods
  });
};

module.exports = {
  getFoods
};