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
router.get("/my-orders", async (req,res)=>{

    const orders = await Order.find({
        user:req.session.user._id
    }).sort({createdAt:-1});

    res.render("my-orders",{
        orders,
        user:req.session.user
    });

});