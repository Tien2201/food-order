router.get("/profile", async (req, res) => {

    const user = await User.findById(
        req.session.user._id
    );

    res.render("profile", {
        user
    });

});
router.post("/profile", async (req, res) => {

    await User.findByIdAndUpdate(
        req.session.user._id,
        {
            fullname: req.body.fullname,
            phone: req.body.phone,
            address: req.body.address
        }
    );

    res.redirect("/profile");

});