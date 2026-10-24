# BoxGuard - AI-Powered Warehouse Automation System

<div align="center">

![BoxGuard Logo](https://img.shields.io/badge/BoxGuard-AI%20Powered-0ea5e9?style=for-the-badge&logo=box&logoColor=white)
![Version](https://img.shields.io/badge/version-1.0.0-success?style=for-the-badge)
![License](https://img.shields.io/badge/license-MIT-blue?style=for-the-badge)

**AI-powered warehouse automation system that eliminates counting errors, provides video proof, and tracks operator performance—all with complete data privacy.**

[Features](#features) • [Tech Stack](#tech-stack) • [Installation](#installation) • [Usage](#usage) • [Documentation](#documentation)

</div>

---

## 🎯 Overview

BoxGuard is an intelligent warehouse automation system built for NEXUS 2025 that uses YOLOv8-powered computer vision to count boxes in real-time, eliminating manual counting errors while maintaining complete data privacy through local processing.

### Key Highlights

- ✅ **95%+ Accuracy**: Custom-trained YOLOv5 model for box detection
- 🎥 **Video Evidence**: Automatic recording of every packing session
- 📄 **Instant Challans**: Auto-generated PDF documents with QR codes
- 📊 **Operator Analytics**: Comprehensive performance tracking and insights
- 🔒 **100% Local**: No cloud dependencies, complete data privacy

---

## ✨ Features

### Core Functionality

#### 1. Real-Time AI Detection
- YOLOv5-powered computer vision with sub-50ms latency
- Custom-trained model achieving 95%+ accuracy on warehouse boxes
- Live box counting with visual feedback
- Adjustable confidence threshold (0-100%)

#### 2. Session Management
- Live camera feed or video upload support
- Batch ID validation (format: WORD-XXX, min 3 digits)
- Operator ID tracking (format: OP-XXX, min 3 digits)
- Pause/Resume/Reset controls during sessions
- Real-time count updates via WebSocket

#### 3. Video Recording
- Automatic recording of all sessions
- Multiple format support (MP4, AVI)
- Downloadable session videos
- Video evidence for dispute resolution

#### 4. PDF Challan Generation
- Professional packing slip layout
- Auto-populated customer and transporter details
- QR code for verification
- Session metadata and box count
- Downloadable PDF documents

#### 5. Operator Analytics
- Performance metrics and throughput trends
- Session history and statistics
- Batch efficiency tracking
- Exportable analytics reports
- Visual charts and graphs

#### 6. User Management
- Secure authentication with JWT tokens
- Password strength validation
- User profile management
- Warehouse and challan information storage

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 19.2.4
- **Build Tool**: Vite 8.0.1
- **Styling**: Tailwind CSS 4.2.2
- **Animations**: Framer Motion 12.38.0
- **Charts**: Recharts 3.8.0
- **Icons**: Lucide React 0.577.0
- **HTTP Client**: Axios 1.13.6
- **Routing**: React Router DOM 7.13.1
- **PDF Export**: jsPDF 4.2.1

### Backend
- **Framework**: Python Flask
- **Database**: MongoDB
- **Real-time**: WebSocket (Flask-Sock)
- **AI/ML**: YOLOv8, OpenCV, Ultralytics
- **Authentication**: JWT, bcrypt
- **PDF Generation**: ReportLab
- **Video Processing**: OpenCV (cv2)

### AI/ML
- **Model**: YOLOv5n (Ultralytics)
- **Framework**: PyTorch
- **Computer Vision**: OpenCV
- **Detection**: Real-time object detection

---

## 📋 Prerequisites

Before installation, ensure you have:

- **Node.js** 16.x or higher
- **Python** 3.8 or higher
- **MongoDB** 4.4 or higher (running locally or remote)
- **Webcam** (optional, for live detection)
- **Git** for cloning the repository

---

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd boxguard
```

### 2. Frontend Setup

```bash
cd Frontend
npm install
```

Create a `.env` file (if needed):
```env
VITE_API_URL=http://localhost:5000
```

### 3. Backend Setup

```bash
cd Backend
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

Create a `.env` file in the Backend directory:
```env
MONGO_URI=mongodb://localhost:27017
JWT_SECRET=your-secret-key-change-in-production
MODEL_PATH=models/box_detection.pt
```

### 4. MongoDB Setup

Ensure MongoDB is running:
```bash
# Windows (if installed as service):
net start MongoDB

# macOS:
brew services start mongodb-community

# Linux:
sudo systemctl start mongod
```

### 5. Download YOLOv5 Model

The YOLOv5n model will be downloaded automatically on first run, or you can manually place it:
```bash
# Custom model: Backend/models/box_detection.pt
# Fallback (used if the custom model is missing): Backend/models/yolov8n.pt
```

---

## 🎮 Usage

### Starting the Application

#### 1. Start MongoDB
Ensure MongoDB is running on `mongodb://localhost:27017`

#### 2. Start Backend Server
```bash
cd Backend
# Activate venv if not already activated
python -m core.app
```
Backend will run on `http://localhost:5000`

#### 3. Start Frontend Development Server
```bash
cd Frontend
npm run dev
```
Frontend will run on `http://localhost:5173`

#### 4. Access the Application
Open your browser and navigate to:
```
http://localhost:5173
```

---

## 📖 User Guide

### First Time Setup

1. **Create Account**
   - Click "Get Started" or "Sign Up"
   - Fill in warehouse details
   - Provide challan information (M/S, Transporter ID, Courier Partner)
   - Create strong password (min 8 chars, uppercase, lowercase, number, special char)

2. **Login**
   - Use your email and password
   - Access the dashboard

### Running a Session

1. **Configure Session**
   - Enter Batch ID (format: BATCH-001, min 3 digits)
   - Enter Operator ID (format: OP-001, min 3 digits)
   - Choose video source (Live Camera or Upload Video)

2. **Start Detection**
   - Click "START SESSION"
   - AI will begin counting boxes in real-time
   - Monitor count and video feed

3. **Session Controls**
   - **Pause/Resume**: Temporarily pause detection
   - **Reset**: Reset count to zero
   - **Confidence Slider**: Adjust detection threshold (35% default)

4. **End Session**
   - Click "STOP SESSION"
   - View final count
   - Download challan PDF
   - Download session video

### Viewing Analytics

1. **Sessions Page**
   - View all completed sessions
   - Filter and search sessions
   - Download challans and videos
   - Delete old sessions

2. **Analytics Page**
   - View operator performance
   - Analyze throughput trends
   - Export comprehensive reports
   - Track batch efficiency

### Profile Management

1. **Update Profile**
   - Click user menu → "Profile Settings"
   - Update warehouse information
   - Modify challan details
   - Save changes

---

## 📁 Project Structure

```
boxguard/
├── Frontend/                    # React frontend application
│   ├── src/
│   │   ├── api/                # API integration
│   │   │   └── index.js        # Axios API calls
│   │   ├── components/         # Reusable components
│   │   │   ├── Header.jsx      # Navigation header
│   │   │   ├── LandingNav.jsx  # Landing page navbar
│   │   │   ├── Motion.jsx      # Animation wrappers
│   │   │   ├── ProtectedRoute.jsx  # Auth guard
│   │   │   └── Tooltip.jsx     # Tooltip component
│   │   ├── context/            # React context
│   │   │   └── SessionContext.jsx  # Session state management
│   │   ├── hooks/              # Custom hooks
│   │   │   └── useWebSocket.js # WebSocket hook
│   │   ├── pages/              # Page components
│   │   │   ├── Dashboard.jsx   # Main dashboard
│   │   │   ├── Landing.jsx     # Landing page
│   │   │   ├── Login.jsx       # Login page
│   │   │   ├── Signup.jsx      # Signup page
│   │   │   ├── Sessions.jsx    # Sessions list
│   │   │   ├── OperatorStats.jsx  # Analytics page
│   │   │   └── Profile.jsx     # User profile
│   │   ├── App.jsx             # Main app component
│   │   ├── main.jsx            # Entry point
│   │   └── index.css           # Global styles
│   ├── public/                 # Static assets
│   ├── index.html              # HTML template
│   ├── package.json            # Dependencies
│   └── vite.config.js          # Vite configuration
│
├── Backend/                     # Python Flask backend
│   ├── core/                  # app.py (API server), database, detection, tracker
│   ├── services/              # pdf_generator.py, video_recorder.py
│   ├── auth/                  # auth.py (JWT authentication)
│   ├── scripts/               # Manual debug/diagnostic scripts
│   ├── models/                # box_detection.pt (custom), yolov8n.pt (fallback)
│   ├── requirements.txt       # Python dependencies
│   └── .env                   # Environment variables
│
├── data/                       # Runtime output (git-ignored)
│   ├── challans/              # Generated PDF challans
│   ├── recordings/            # Session video recordings
│   └── uploads/               # Uploaded videos
│
├── docs/                       # DESIGN_SYSTEM.md, PROJECT_STRUCTURE.md
├── archive/                    # Superseded early implementation
├── start.bat                   # Starts backend + frontend (Windows)
└── README.md                   # This file
```

---

## 🔧 Configuration

### Backend Configuration (.env)

```env
# MongoDB Connection
MONGO_URI=mongodb://localhost:27017

# JWT Authentication
JWT_SECRET=your-secret-key-change-in-production

# AI Model
MODEL_PATH=models/box_detection.pt

# Server Settings
FLASK_ENV=development
FLASK_DEBUG=True
```

### Frontend Configuration

The frontend uses Vite and connects to `http://localhost:5000` by default. Update API endpoints in `Frontend/src/api/index.js` if needed.

---

## 🎨 Features in Detail

### Batch ID Validation
- Format: `WORD-XXX` (e.g., BATCH-001, WH-123)
- Minimum 3 digits required
- Auto-uppercase
- Duplicate checking per user
- Real-time validation with debounce

### Operator ID Validation
- Format: `OP-XXX` (e.g., OP-001, OP-123)
- Minimum 3 digits required
- Auto-uppercase
- Can be reused across batches
- Real-time format validation

### Video Sources
1. **Live Camera**: Real-time webcam feed
2. **Upload Video**: Pre-recorded video files (MP4, AVI, MOV, WEBM)

### PDF Challan Format
- Company header: "BoxGuard Systems"
- Customer details section
- Challan information with session ID
- Product table with box count
- Footer with generation timestamp
- QR code for verification

---

## 🔐 Security Features

- **Password Requirements**:
  - Minimum 8 characters
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one number
  - At least one special character (@$!%*?&)

- **JWT Authentication**:
  - 24-hour token expiration
  - Secure token storage
  - Protected routes

- **Data Privacy**:
  - 100% local processing
  - No cloud dependencies
  - All data stored locally

---

## 📊 API Endpoints

### Authentication
- `POST /auth/signup` - Create new user account
- `POST /auth/login` - User login
- `GET /profile` - Get user profile
- `PUT /profile` - Update user profile

### Sessions
- `GET /sessions` - List all sessions
- `POST /sessions` - Create new session
- `GET /sessions/<id>` - Get session details
- `DELETE /sessions/<id>` - Delete session
- `GET /sessions/<id>/video` - Download session video
- `GET /sessions/<id>/challan` - Download challan PDF

### Validation
- `POST /validate/batch` - Validate batch ID
- `POST /validate/operator` - Validate operator ID

### Controls
- `POST /control/pause` - Pause/resume session
- `POST /control/reset` - Reset count
- `POST /settings/confidence` - Update confidence threshold

### WebSocket
- `WS /detection` - Real-time detection stream

---

## 🐛 Troubleshooting

### Common Issues

**MongoDB Connection Error**
```
Solution: Ensure MongoDB is running on localhost:27017
Check: mongod --version
Start: net start MongoDB (Windows) or brew services start mongodb-community (macOS)
```

**YOLOv5 Model Not Found**
```
Solution: Model will auto-download on first run
Manual: Download yolov5n.pt and place in Backend/models/
```

**WebSocket Connection Failed**
```
Solution: Ensure backend is running on port 5000
Check: Backend console for errors
Restart: Stop and restart backend server
```

**Camera Access Denied**
```
Solution: Grant camera permissions in browser settings
Check: Browser console for permission errors
```

---

## 🤝 Contributing

This project was built for NEXUS 2025. For contributions or issues, please contact the development team.

---

## 📄 License

© 2025 BoxGuard. All rights reserved.

---

## 👥 Team

**Built For**: NEXUS 2025  
**Institution**: VYES Institute of Technology  
**Track**: Senior AI/ML

---

## 🙏 Acknowledgments

- **Ultralytics** for YOLOv5
- **OpenCV** for computer vision capabilities
- **MongoDB** for database solutions
- **React** and **Vite** for frontend framework
- **Flask** for backend framework

---

## 📞 Support

For support, questions, or feedback:
- Open an issue in the repository
- Contact the development team
- Check documentation in `/docs` (if available)

---

<div align="center">

**BoxGuard** - Count Smarter. Pack Smarter. Ship Smarter.

Made with ❤️ for warehouse automation

</div>
