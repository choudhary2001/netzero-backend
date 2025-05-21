import User from "../Models/user.js";

export const fetchRole = async (req, res) => {
  console.log("The fetch role function is called ");
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    return res.json({ role: user.role });
  } catch (error) {
    console.error("Error fetching role:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

