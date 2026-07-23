const Client = require('../models/Client');
const { logActivity } = require('../services/activityLogger');

// @desc Get clients (with search, filter, pagination, role isolation)
// @route GET /api/clients
const getClients = async (req, res, next) => {
  try {
    const { search, status, executive, page = 1, limit = 20 } = req.query;
    let query = {};

    // Executive can only view assigned clients
    if (req.user.role === 'executive') {
      query.assignedExecutive = req.user._id;
    } else if (executive) {
      query.assignedExecutive = executive;
    }

    if (status) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { companyName: { $regex: search, $options: 'i' } },
        { ownerName: { $regex: search, $options: 'i' } },
        { mobile: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { city: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const total = await Client.countDocuments(query);

    const clients = await Client.find(query)
      .populate('assignedExecutive', 'name email phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    res.json({
      success: true,
      count: clients.length,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      clients,
    });
  } catch (error) {
    next(error);
  }
};

// @desc Get single client details
// @route GET /api/clients/:id
const getClientById = async (req, res, next) => {
  try {
    const client = await Client.findById(req.params.id).populate('assignedExecutive', 'name email phone');
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    if (req.user.role === 'executive' && client.assignedExecutive._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this client' });
    }

    res.json({ success: true, client });
  } catch (error) {
    next(error);
  }
};

// @desc Create new client
// @route POST /api/clients
const createClient = async (req, res, next) => {
  try {
    const { companyName, ownerName, mobile, whatsapp, email, gstNumber, address, city, state, pincode, notes, assignedExecutive, nfcProfileUrl, googleReviewUrl } = req.body;

    const execId = req.user.role === 'executive' ? req.user._id : (assignedExecutive || req.user._id);

    const client = await Client.create({
      companyName,
      ownerName,
      mobile,
      whatsapp: whatsapp || mobile,
      email,
      gstNumber: gstNumber || '',
      address,
      city,
      state,
      pincode,
      notes: notes || '',
      assignedExecutive: execId,
      nfcProfileUrl: nfcProfileUrl || '',
      googleReviewUrl: googleReviewUrl || '',
    });

    await logActivity({
      user: req.user._id,
      module: 'Client Management',
      action: 'Create Client',
      description: `Added new client ${companyName} (${ownerName})`,
    });

    res.status(201).json({ success: true, client });
  } catch (error) {
    next(error);
  }
};

// @desc Update client
// @route PUT /api/clients/:id
const updateClient = async (req, res, next) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    if (req.user.role === 'executive' && client.assignedExecutive.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this client' });
    }

    Object.assign(client, req.body);
    const updatedClient = await client.save();

    await logActivity({
      user: req.user._id,
      module: 'Client Management',
      action: 'Update Client',
      description: `Updated client details for ${client.companyName}`,
    });

    res.json({ success: true, client: updatedClient });
  } catch (error) {
    next(error);
  }
};

// @desc Delete client
// @route DELETE /api/clients/:id
const deleteClient = async (req, res, next) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    await Client.findByIdAndDelete(req.params.id);

    await logActivity({
      user: req.user._id,
      module: 'Client Management',
      action: 'Delete Client',
      description: `Deleted client ${client.companyName}`,
    });

    res.json({ success: true, message: 'Client deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getClients, getClientById, createClient, updateClient, deleteClient };
