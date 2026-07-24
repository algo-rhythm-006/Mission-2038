const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// 1. USER SCHEMA
const UserSchema = new Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['player', 'scout', 'coach', 'admin'], required: true },
  isVerified: { type: Boolean, default: false },
  verificationToken: { type: String },
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
  refreshToken: { type: String },
  googleId: { type: String },
  createdAt: { type: Date, default: Date.now }
});

// 2. PROFILE SCHEMA
const ProfileSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  name: { type: String, required: true },
  phone: { type: String },
  dob: { type: Date },
  age: { type: Number },
  gender: { type: String, enum: ['male', 'female', 'other'] },
  profilePhoto: { type: String, default: '' },
  bio: { type: String, default: '' },
  state: { type: String },
  district: { type: String },
  city: { type: String },
  pin: { type: String },
  languages: [{ type: String }],
  certificates: [{ type: String }],
  achievements: [{ type: String }],
  experience: { type: Number, default: 0 }, // Years
  verifiedBadge: { type: Boolean, default: false },

  // --- PLAYER SPECIFIC FIELDS ---
  height: { type: Number }, // in cm
  weight: { type: Number }, // in kg
  dominantFoot: { type: String, enum: ['right', 'left', 'both'] },
  preferredPosition: { type: String },
  secondaryPosition: { type: String },
  currentClub: { type: String, default: '' },
  previousClub: { type: String, default: '' },
  matchesPlayed: { type: Number, default: 0 },
  goals: { type: Number, default: 0 },
  assists: { type: Number, default: 0 },
  cleanSheets: { type: Number, default: 0 },
  preferredLeague: { type: String, default: '' },
  emergencyContact: {
    name: { type: String },
    phone: { type: String },
    relation: { type: String }
  },
  socials: {
    instagram: { type: String, default: '' },
    facebook: { type: String, default: '' },
    youtube: { type: String, default: '' }
  },
  governmentId: { type: String }, // Encrypted or file url
  medicalHistory: { type: String, default: '' },
  fitnessLevel: { type: String, enum: ['excellent', 'good', 'average', 'recovery'], default: 'good' },
  availability: { type: String, enum: ['available', 'injured', 'not-available'], default: 'available' },
  highlightVideo: { type: String, default: '' },
  matchVideos: [{ type: String }],
  skills: {
    speed: { type: Number, default: 50 },
    passing: { type: Number, default: 50 },
    dribbling: { type: Number, default: 50 },
    finishing: { type: Number, default: 50 },
    defending: { type: Number, default: 50 },
    vision: { type: Number, default: 50 },
    stamina: { type: Number, default: 50 },
    potential: { type: Number, default: 50 },
    aiScore: { type: Number, default: 50 }
  },
  careerTimeline: [{
    year: { type: Number },
    club: { type: String },
    description: { type: String }
  }],

  // --- SCOUT SPECIFIC FIELDS ---
  organization: { type: String },
  clubRepresenting: { type: String },
  designation: { type: String },
  license: { type: String },
  verificationDocuments: [{ type: String }],
  areasOfInterest: [{ type: String }],
  ageGroupsCovered: [{ type: String }],
  positionsInterested: [{ type: String }],
  savedPlayers: [{ type: Schema.Types.ObjectId, ref: 'User' }],

  // --- COACH SPECIFIC FIELDS ---
  teamsManaged: [{ type: String }],
  specializations: [{ type: String }]
}, { timestamps: true });

// 3. VIDEO SCHEMA
const VideoSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  url: { type: String, required: true },
  thumbnailUrl: { type: String, default: '' },
  size: { type: Number }, // in bytes
  duration: { type: Number }, // in seconds
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'approved' }, // auto-approve for now
  isAnalyzed: { type: Boolean, default: false },
  drillType: { type: String, enum: ['shooting', 'dribbling', 'goalkeeper'] }
}, { timestamps: true });

// 4. ANALYSIS SCHEMA
const AnalysisSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  video: { type: Schema.Types.ObjectId, ref: 'Video' },
  drillType: { type: String, enum: ['shooting', 'dribbling', 'goalkeeper'], required: true },
  status: { type: String, enum: ['processing', 'completed', 'failed'], default: 'completed' },
  sessionLog: [Schema.Types.Mixed], // array of event records
  stats: { type: Schema.Types.Mixed }, // specific metrics
  report: { type: String }, // Gemini coaching tips
  createdAt: { type: Date, default: Date.now }
});

// 5. CHAT SCHEMA
const ChatSchema = new Schema({
  participants: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  lastMessage: { type: String, default: '' },
  lastMessageAt: { type: Date, default: Date.now }
}, { timestamps: true });

// 6. MESSAGE SCHEMA
const MessageSchema = new Schema({
  chat: { type: Schema.Types.ObjectId, ref: 'Chat', required: true },
  sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String },
  mediaUrl: { type: String },
  mediaType: { type: String, enum: ['image', 'video'] },
  seen: { type: Boolean, default: false }
}, { timestamps: true });

// 7. POST SCHEMA (Football Instagram)
const PostSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, default: '' },
  mediaUrl: { type: String },
  mediaType: { type: String, enum: ['image', 'video'] },
  likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  commentsCount: { type: Number, default: 0 }
}, { timestamps: true });

// 8. COMMENT SCHEMA
const CommentSchema = new Schema({
  post: { type: Schema.Types.ObjectId, ref: 'Post', required: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true }
}, { timestamps: true });

// 9. FOLLOWER SCHEMA
const FollowerSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true }, // person followed
  follower: { type: Schema.Types.ObjectId, ref: 'User', required: true } // person following
}, { timestamps: true });

// 10. NOTIFICATION SCHEMA
const NotificationSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['follow', 'comment', 'like', 'trial', 'message', 'alert'], required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  data: { type: Schema.Types.Mixed },
  read: { type: Boolean, default: false }
}, { timestamps: true });

// 11. TOURNAMENT SCHEMA
const TournamentSchema = new Schema({
  name: { type: String, required: true },
  description: { type: String, default: '' },
  organizer: { type: String, default: 'Mission 2K38 Association' },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  location: { type: String, required: true },
  coordinates: {
    lat: { type: Number },
    lng: { type: Number }
  },
  logo: { type: String, default: '' },
  maxTeams: { type: Number, default: 16 },
  status: { type: String, enum: ['upcoming', 'ongoing', 'completed'], default: 'upcoming' }
}, { timestamps: true });

// 12. APPLICATION SCHEMA (Tournament registration)
const ApplicationSchema = new Schema({
  tournament: { type: Schema.Types.ObjectId, ref: 'Tournament', required: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true }, // player/captain applying
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  paymentStatus: { type: String, enum: ['pending', 'paid'], default: 'pending' }
}, { timestamps: true });

// 13. TRIAL SCHEMA (Scout invites player for trials)
const TrialSchema = new Schema({
  scout: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  player: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  time: { type: String, required: true },
  location: { type: String, required: true },
  status: { type: String, enum: ['scheduled', 'completed', 'cancelled'], default: 'scheduled' },
  notes: { type: String, default: '' }
}, { timestamps: true });

// Registering models
const User = mongoose.models.User || mongoose.model('User', UserSchema);
const Profile = mongoose.models.Profile || mongoose.model('Profile', ProfileSchema);
const Video = mongoose.models.Video || mongoose.model('Video', VideoSchema);
const Analysis = mongoose.models.Analysis || mongoose.model('Analysis', AnalysisSchema);
const Chat = mongoose.models.Chat || mongoose.model('Chat', ChatSchema);
const Message = mongoose.models.Message || mongoose.model('Message', MessageSchema);
const Post = mongoose.models.Post || mongoose.model('Post', PostSchema);
const Comment = mongoose.models.Comment || mongoose.model('Comment', CommentSchema);
const Follower = mongoose.models.Follower || mongoose.model('Follower', FollowerSchema);
const Notification = mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);
const Tournament = mongoose.models.Tournament || mongoose.model('Tournament', TournamentSchema);
const Application = mongoose.models.Application || mongoose.model('Application', ApplicationSchema);
const Trial = mongoose.models.Trial || mongoose.model('Trial', TrialSchema);

module.exports = {
  User,
  Profile,
  Video,
  Analysis,
  Chat,
  Message,
  Post,
  Comment,
  Follower,
  Notification,
  Tournament,
  Application,
  Trial
};
