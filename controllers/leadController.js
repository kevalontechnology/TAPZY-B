const Lead = require('../models/Lead');
const Client = require('../models/Client');
const { logActivity } = require('../services/activityLogger');
const { sendNotification } = require('../services/notificationService');

// @desc Get leads
// @route GET /api/leads
const getLeads = async (req, res, next) => {
  try {
    const { status, search, executive, page = 1, limit = 20 } = req.query;
    let query = {};

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
        { clientName: { $regex: search, $options: 'i' } },
        { companyName: { $regex: search, $options: 'i' } },
        { mobile: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const total = await Lead.countDocuments(query);

    const leads = await Lead.find(query)
      .populate('assignedExecutive', 'name email phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    res.json({
      success: true,
      count: leads.length,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      leads,
    });
  } catch (error) {
    next(error);
  }
};

// @desc Create new lead
// @route POST /api/leads
const createLead = async (req, res, next) => {
  try {
    const { clientName, companyName, mobile, whatsapp, email, status, source, followUpDate, notes, assignedExecutive } = req.body;

    const execId = req.user.role === 'executive' ? req.user._id : (assignedExecutive || req.user._id);

    const lead = await Lead.create({
      clientName,
      companyName,
      mobile,
      whatsapp: whatsapp || mobile,
      email: email || '',
      status: status || 'New',
      source: source || 'Direct Visit',
      assignedExecutive: execId,
      followUpDate: followUpDate || null,
      notes: notes || '',
      activityTimeline: [
        {
          action: 'Lead Created',
          note: `Lead created for ${companyName} (${clientName})`,
          performedBy: req.user._id,
        },
      ],
    });

    await logActivity({
      user: req.user._id,
      module: 'Lead Management',
      action: 'Create Lead',
      description: `Added lead for ${companyName}`,
    });

    res.status(201).json({ success: true, lead });
  } catch (error) {
    next(error);
  }
};

// @desc Update lead status & add activity timeline entry
// @route PUT /api/leads/:id
const updateLead = async (req, res, next) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    if (req.user.role === 'executive' && lead.assignedExecutive.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this lead' });
    }

    const prevStatus = lead.status;
    const { status, followUpDate, notes, noteActivity } = req.body;

    if (status) lead.status = status;
    if (followUpDate !== undefined) lead.followUpDate = followUpDate;
    if (notes) lead.notes = notes;

    let actionText = 'Updated Lead';
    if (status && status !== prevStatus) {
      actionText = `Status changed to ${status}`;
    }

    lead.activityTimeline.unshift({
      action: actionText,
      note: noteActivity || notes || `Updated status from ${prevStatus} to ${lead.status}`,
      performedBy: req.user._id,
    });

    const updatedLead = await lead.save();

    await logActivity({
      user: req.user._id,
      module: 'Lead Management',
      action: 'Update Lead',
      description: `Updated lead ${lead.companyName}: ${actionText}`,
    });

    res.json({ success: true, lead: updatedLead });
  } catch (error) {
    next(error);
  }
};

// @desc Convert Lead to Client
// @route POST /api/leads/:id/convert
const convertLeadToClient = async (req, res, next) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    const { address, city, state, pincode, gstNumber } = req.body;

    const client = await Client.create({
      companyName: lead.companyName,
      ownerName: lead.clientName,
      mobile: lead.mobile,
      whatsapp: lead.whatsapp || lead.mobile,
      email: lead.email || `${lead.clientName.toLowerCase().replace(/\s+/g, '')}@client.com`,
      gstNumber: gstNumber || '',
      address: address || 'Main Commercial Market',
      city: city || 'Ahmedabad',
      state: state || 'Gujarat',
      pincode: pincode || '380001',
      assignedExecutive: lead.assignedExecutive,
      notes: `Converted from Lead on ${new Date().toLocaleDateString()}`,
    });

    lead.status = 'Converted';
    lead.activityTimeline.unshift({
      action: 'Converted to Client',
      note: `Successfully converted lead to client profile (ID: ${client._id})`,
      performedBy: req.user._id,
    });
    await lead.save();

    await logActivity({
      user: req.user._id,
      module: 'Lead Management',
      action: 'Convert Lead',
      description: `Converted lead ${lead.companyName} to Client`,
    });

    await sendNotification({
      user: lead.assignedExecutive,
      roleTarget: 'all',
      title: 'Lead Converted!',
      message: `Lead ${lead.companyName} converted into a client successfully!`,
      type: 'follow_up',
    });

    res.json({ success: true, message: 'Lead converted to Client', client, lead });
  } catch (error) {
    next(error);
  }
};

// @desc Delete lead
// @route DELETE /api/leads/:id
const deleteLead = async (req, res, next) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    await Lead.findByIdAndDelete(req.params.id);

    await logActivity({
      user: req.user._id,
      module: 'Lead Management',
      action: 'Delete Lead',
      description: `Deleted lead ${lead.companyName}`,
    });

    res.json({ success: true, message: 'Lead deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getLeads, createLead, updateLead, convertLeadToClient, deleteLead };
