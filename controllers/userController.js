const User = require('../models/User');
const { logActivity } = require('../services/activityLogger');

// @desc Get all users
// @route GET /api/users
const getUsers = async (req, res, next) => {
  try {
    const { role, search } = req.query;
    let query = {};

    if (role) {
      query.role = role;
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    const users = await User.find(query).select('-password').sort({ createdAt: -1 });
    res.json({ success: true, count: users.length, users });
  } catch (error) {
    next(error);
  }
};

// @desc Create new Admin/Executive
// @route POST /api/users
const createUser = async (req, res, next) => {
  try {
    const { name, email, password, phone, role, address } = req.body;
    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ success: false, message: 'User already exists with this email' });
    }

    const user = await User.create({
      name,
      email,
      password,
      phone,
      role: role || 'executive',
      address: address || '',
    });

    await logActivity({
      user: req.user._id,
      module: 'User Management',
      action: 'Create User',
      description: `Created user ${name} (${role})`,
    });

    res.status(201).json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc Update user details
// @route PUT /api/users/:id
const updateUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.name = req.body.name || user.name;
    user.email = req.body.email || user.email;
    user.phone = req.body.phone || user.phone;
    user.role = req.body.role || user.role;
    user.status = req.body.status || user.status;
    user.address = req.body.address || user.address;

    if (req.body.password) {
      user.password = req.body.password;
    }

    const updatedUser = await user.save();

    await logActivity({
      user: req.user._id,
      module: 'User Management',
      action: 'Update User',
      description: `Updated user details for ${updatedUser.name}`,
    });

    res.json({ success: true, user: updatedUser });
  } catch (error) {
    next(error);
  }
};

// @desc Delete user
// @route DELETE /api/users/:id
const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    await User.findByIdAndDelete(req.params.id);

    await logActivity({
      user: req.user._id,
      module: 'User Management',
      action: 'Delete User',
      description: `Deleted user ${user.name}`,
    });

    res.json({ success: true, message: 'User removed successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getUsers, createUser, updateUser, deleteUser };
