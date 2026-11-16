import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import {
  Megaphone,
  Vote,
  Calendar,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  Clock,
  MapPin,
  Users
} from 'lucide-react';

export const CommunityBoard = () => {
  const [activeTab, setActiveTab] = useState('ANNOUNCEMENTS'); // 'ANNOUNCEMENTS', 'POLLS', 'EVENTS'
  const [announcements, setAnnouncements] = useState([]);
  const [polls, setPolls] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [votingId, setVotingId] = useState(null);

  const fetchCommunityData = async () => {
    try {
      const [annRes, pollRes, evtRes] = await Promise.all([
        api.get('/community/announcements'),
        api.get('/community/polls'),
        api.get('/community/events')
      ]);
      if (annRes.success) setAnnouncements(annRes.data);
      if (pollRes.success) setPolls(pollRes.data);
      if (evtRes.success) setEvents(evtRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommunityData();
  }, []);

  const handleVote = async (pollId, optionIndex) => {
    setVotingId(pollId);
    try {
      const res = await api.post(`/community/polls/${pollId}/vote`, { optionIndex });
      if (res.success) {
        fetchCommunityData();
      }
    } catch (err) {
      alert(err.message || 'Failed to submit vote');
    } finally {
      setVotingId(null);
    }
  };

  const handleRSVP = async (eventId, response) => {
    try {
      const res = await api.post(`/community/events/${eventId}/rsvp`, { response });
      if (res.success) {
        fetchCommunityData();
      }
    } catch (err) {
      alert(err.message || 'Failed to RSVP');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-100">Community Notice Board, Polls & Events</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Society-wide announcements, residential democratic polls, and upcoming social events
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('ANNOUNCEMENTS')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'ANNOUNCEMENTS'
              ? 'bg-teal-500/15 text-teal-300 border border-teal-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Megaphone className="w-4 h-4" />
          <span>Announcements ({announcements.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('POLLS')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'POLLS'
              ? 'bg-teal-500/15 text-teal-300 border border-teal-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Vote className="w-4 h-4" />
          <span>Society Polls ({polls.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('EVENTS')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'EVENTS'
              ? 'bg-teal-500/15 text-teal-300 border border-teal-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Events Calendar ({events.length})</span>
        </button>
      </div>

      {loading ? (
        <LoadingSpinner text="Loading community feed..." />
      ) : (
        <>
          {/* ANNOUNCEMENTS TAB */}
          {activeTab === 'ANNOUNCEMENTS' && (
            <div className="space-y-4">
              {announcements.map((ann) => (
                <div key={ann._id} className="glass-card p-6 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {ann.pinned && (
                        <span className="px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 text-[10px] font-bold">
                          PINNED
                        </span>
                      )}
                      <Badge variant={ann.priority}>{ann.priority}</Badge>
                      <h3 className="text-sm font-bold text-slate-100">{ann.title}</h3>
                    </div>
                    <span className="text-xs text-slate-500 font-mono whitespace-nowrap">
                      {new Date(ann.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">
                    {ann.content}
                  </p>

                  <div className="pt-2 border-t border-slate-700/40 text-[11px] text-slate-400 flex items-center justify-between">
                    <span>Published by: <strong className="text-slate-200">{ann.authorName}</strong></span>
                    <span className="text-teal-400 font-medium">Society General Notice</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* POLLS TAB */}
          {activeTab === 'POLLS' && (
            <div className="space-y-6">
              {polls.map((poll) => {
                const isClosed = poll.status !== 'ACTIVE';
                return (
                  <div key={poll._id} className="glass-card p-6 space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <Badge variant={isClosed ? 'CANCELLED' : 'APPROVED'}>
                            {isClosed ? 'EXPIRED' : 'ACTIVE VOTING'}
                          </Badge>
                          <span className="text-[11px] text-slate-400">
                            Strict Rule: 1 Vote Per Apartment
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-slate-100">{poll.question}</h3>
                        {poll.description && (
                          <p className="text-xs text-slate-400 mt-1">{poll.description}</p>
                        )}
                      </div>

                      <span className="text-xs font-mono text-teal-400 font-bold bg-teal-500/10 px-3 py-1 rounded-full shrink-0">
                        {poll.totalVotes} Total Votes
                      </span>
                    </div>

                    {/* Poll Options */}
                    <div className="space-y-3 pt-2">
                      {poll.options?.map((option, idx) => {
                        const pct = poll.totalVotes > 0 ? Math.round((option.votesCount / poll.totalVotes) * 100) : 0;
                        const isVotedChoice = poll.hasVoted && poll.selectedOptionIndex === idx;

                        return (
                          <div key={idx} className="relative overflow-hidden rounded-xl border border-slate-700/80 p-3.5 bg-slate-800/40">
                            {/* Vote Progress Bar */}
                            <div
                              className="absolute inset-y-0 left-0 bg-teal-500/15 transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            ></div>

                            <div className="relative z-10 flex items-center justify-between gap-3 text-xs">
                              <div className="flex items-center gap-2">
                                {isVotedChoice && (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                )}
                                <span className={`font-medium ${isVotedChoice ? 'text-teal-300 font-bold' : 'text-slate-200'}`}>
                                  {option.text}
                                </span>
                              </div>

                              <div className="flex items-center gap-3 shrink-0">
                                <span className="font-mono text-slate-400">{option.votesCount} ({pct}%)</span>
                                {!poll.hasVoted && !isClosed && (
                                  <button
                                    onClick={() => handleVote(poll._id, idx)}
                                    disabled={votingId === poll._id}
                                    className="btn-primary text-[11px] py-1 px-3"
                                  >
                                    Vote
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {poll.hasVoted && (
                      <p className="text-[11px] text-emerald-400 font-medium flex items-center gap-1.5 pt-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Your apartment has recorded its official vote. Thank you for participating!</span>
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* EVENTS TAB */}
          {activeTab === 'EVENTS' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {events.map((evt) => (
                <div key={evt._id} className="glass-card p-6 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between text-xs text-teal-400 font-bold font-mono">
                      <span>{new Date(evt.eventDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      <span>{evt.startTime} - {evt.endTime}</span>
                    </div>

                    <h3 className="text-base font-bold text-slate-100 mt-2">{evt.title}</h3>
                    <p className="text-xs text-slate-400 mt-1">{evt.description}</p>

                    <div className="mt-4 pt-3 border-t border-slate-700/60 space-y-1.5 text-xs text-slate-300">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-slate-500" />
                        <span>{evt.location}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-slate-500" />
                        <span>{evt.rsvps?.length || 0} Residents Attending</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-700/60 flex items-center justify-between">
                    <span className="text-xs text-slate-400">RSVP Status:</span>
                    <div className="flex items-center gap-2">
                      {['GOING', 'NOT_GOING'].map((choice) => (
                        <button
                          key={choice}
                          onClick={() => handleRSVP(evt._id, choice)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            choice === 'GOING'
                              ? 'btn-primary text-xs'
                              : 'btn-secondary text-xs text-slate-400'
                          }`}
                        >
                          {choice === 'GOING' ? 'Attending' : 'Not Going'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};
