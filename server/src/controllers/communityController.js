import { Announcement } from '../models/Announcement.js';
import { Poll, PollVote } from '../models/Poll.js';
import { Event } from '../models/Event.js';
import { ROLES } from '../constants/index.js';
import { logAudit } from '../services/auditService.js';
import { broadcastSocietyAlert } from '../services/notificationService.js';

// --- ANNOUNCEMENTS ---
export const getAnnouncements = async (req, res, next) => {
  try {
    const announcements = await Announcement.find({ societyId: req.societyId })
      .sort({ pinned: -1, createdAt: -1 });

    res.json({ success: true, data: announcements });
  } catch (error) {
    next(error);
  }
};

export const createAnnouncement = async (req, res, next) => {
  try {
    const { title, content, category, priority, pinned, targetWings } = req.body;

    const announcement = await Announcement.create({
      societyId: req.societyId,
      title,
      content,
      category: category || 'GENERAL',
      priority: priority || 'NORMAL',
      pinned: !!pinned,
      authorId: req.user._id,
      authorName: req.user.name,
      targetWings: targetWings || []
    });

    await logAudit({
      req,
      action: 'CREATE_ANNOUNCEMENT',
      entity: 'Announcement',
      entityId: announcement._id,
      newState: { title, priority }
    });

    if (priority === 'URGENT') {
      await broadcastSocietyAlert({
        societyId: req.societyId,
        type: 'EMERGENCY_ALERT',
        title: `URGENT NOTICE: ${title}`,
        message: content,
        link: '/community'
      });
    }

    res.status(201).json({ success: true, message: 'Announcement published', data: announcement });
  } catch (error) {
    next(error);
  }
};

export const deleteAnnouncement = async (req, res, next) => {
  try {
    const announcement = await Announcement.findOneAndDelete({
      _id: req.params.id,
      societyId: req.societyId
    });

    if (!announcement) {
      return res.status(404).json({ success: false, message: 'Announcement not found' });
    }

    res.json({ success: true, message: 'Announcement removed' });
  } catch (error) {
    next(error);
  }
};

// --- POLLS ---
export const getPolls = async (req, res, next) => {
  try {
    const polls = await Poll.find({ societyId: req.societyId }).sort({ createdAt: -1 });

    // Check if resident's apartment has already voted
    let userVotedPollIds = [];
    if (req.user.apartmentId) {
      const votes = await PollVote.find({
        societyId: req.societyId,
        apartmentId: req.user.apartmentId
      }).select('pollId selectedOptionIndex');
      userVotedPollIds = votes;
    }

    const enrichedPolls = polls.map(poll => {
      const voteRecord = userVotedPollIds.find(v => v.pollId.toString() === poll._id.toString());
      return {
        ...poll.toObject(),
        hasVoted: !!voteRecord,
        selectedOptionIndex: voteRecord ? voteRecord.selectedOptionIndex : null
      };
    });

    res.json({ success: true, data: enrichedPolls });
  } catch (error) {
    next(error);
  }
};

export const createPoll = async (req, res, next) => {
  try {
    const { question, description, options, expiresAt } = req.body;

    if (!options || options.length < 2) {
      return res.status(400).json({ success: false, message: 'At least 2 poll options are required' });
    }

    const formattedOptions = options.map(opt => ({ text: opt, votesCount: 0 }));

    const poll = await Poll.create({
      societyId: req.societyId,
      question,
      description: description || '',
      options: formattedOptions,
      expiresAt: new Date(expiresAt),
      createdById: req.user._id,
      status: 'ACTIVE'
    });

    res.status(201).json({ success: true, message: 'Poll published', data: poll });
  } catch (error) {
    next(error);
  }
};

export const votePoll = async (req, res, next) => {
  try {
    const { optionIndex } = req.body;
    const pollId = req.params.id;

    const apartmentId = req.user.apartmentId;
    if (!apartmentId) {
      return res.status(400).json({
        success: false,
        message: 'Must be associated with an apartment to cast a poll vote.'
      });
    }

    const poll = await Poll.findOne({ _id: pollId, societyId: req.societyId });
    if (!poll) {
      return res.status(404).json({ success: false, message: 'Poll not found' });
    }

    if (poll.status !== 'ACTIVE' || new Date() > new Date(poll.expiresAt)) {
      return res.status(400).json({ success: false, message: 'This poll is closed for voting.' });
    }

    if (optionIndex < 0 || optionIndex >= poll.options.length) {
      return res.status(400).json({ success: false, message: 'Invalid option selected.' });
    }

    // Check duplicate vote for this apartment (Strict 1-vote-per-apartment rule)
    const existingVote = await PollVote.findOne({ pollId, apartmentId });
    if (existingVote) {
      return res.status(409).json({
        success: false,
        message: 'Your apartment has already cast a vote in this poll.',
        code: 'ALREADY_VOTED'
      });
    }

    await PollVote.create({
      societyId: req.societyId,
      pollId,
      userId: req.user._id,
      apartmentId,
      selectedOptionIndex: optionIndex
    });

    poll.options[optionIndex].votesCount += 1;
    poll.totalVotes += 1;
    await poll.save();

    res.json({ success: true, message: 'Vote recorded successfully', data: poll });
  } catch (error) {
    next(error);
  }
};

// --- EVENTS ---
export const getEvents = async (req, res, next) => {
  try {
    const events = await Event.find({ societyId: req.societyId }).sort({ eventDate: 1 });
    res.json({ success: true, data: events });
  } catch (error) {
    next(error);
  }
};

export const createEvent = async (req, res, next) => {
  try {
    const { title, description, location, eventDate, startTime, endTime, bannerUrl, organizer } = req.body;

    const event = await Event.create({
      societyId: req.societyId,
      title,
      description,
      location,
      eventDate: new Date(eventDate),
      startTime,
      endTime,
      bannerUrl: bannerUrl || '',
      organizer: organizer || 'Society Management'
    });

    res.status(201).json({ success: true, message: 'Event scheduled', data: event });
  } catch (error) {
    next(error);
  }
};

export const rsvpEvent = async (req, res, next) => {
  try {
    const { response = 'GOING', guestsCount = 1 } = req.body;
    const event = await Event.findOne({ _id: req.params.id, societyId: req.societyId });

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    // Remove existing RSVP if any
    event.rsvps = event.rsvps.filter(r => r.userId.toString() !== req.user._id.toString());

    event.rsvps.push({
      userId: req.user._id,
      apartmentId: req.user.apartmentId,
      userName: req.user.name,
      guestsCount,
      response,
      timestamp: new Date()
    });

    await event.save();

    res.json({ success: true, message: `RSVP updated: ${response}`, data: event });
  } catch (error) {
    next(error);
  }
};
