# To-Do List for Project Enhancements


## 4. Authentication & Access Control
### 4.1 Log In to Chat in Admin
- **Task**: Implement an authentication system for admin users.
- **Details**: Create middleware to enforce admin authentication.

```javascript
// middleware/adminAuth.js
const adminAuth = (req, res, next) => {
    const isAdmin = req.user && req.user.role === 'admin'; // Adjust to fit your user role setup
    if (!isAdmin) {
        return res.status(403).send("Admin access required.");
    }
    next();
};
// Apply the middleware to your chat route
app.post('/api/chat', adminAuth, chatHandler);
```

### 4.2 Usage Restrictions for Non-Logged Users
#### 4.2.1 Queue for Non-Logged In Users
- **Task**: Implement a queuing mechanism for queries from non-logged users.
- **Details**: Limit the number of queries per user.

#### 4.2.2 Rate Limits
- **Task**: Set a maximum request limit for non-authenticated users (e.g., 5 requests/min).
- **Details**: Return specific error messages when limits are exceeded.

```javascript
// middleware/rateLimit.js
const rateLimit = require('express-rate-limit');
const queue = [];
const userRequests = new Map();
const limiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 5, // Limit each IP to 5 requests per windowMs
    handler: (req, res) => {
        return res.status(429).json({ message: "Too many requests, please try again later." });
    }
});
// Middleware to manage non-logged users
const queueNonLoggedUsers = (req, res, next) => {
    const userId = req.headers['user_id'] || 'guest';
    if (!req.user) {
        if (userRequests.has(userId)) {
            const requestsCount = userRequests.get(userId);
            if (requestsCount >= 5) {
                return res.status(429).json({ message: "You have exceeded your request limit." });
            }
            userRequests.set(userId, requestsCount + 1);
        } else {
            userRequests.set(userId, 1);
        }
        // Queue the request
        queue.push({ userId, request: req.body });
        return res.status(403).json({ message: "You need to be logged in to access this feature." });
    }
    next();
};
// Process queued requests periodically
setInterval(processQueue, 60000);
```

## 5. Research Scheduling
### 5.1 Scheduler for Research Missions
- **Task**: Use node-cron to fetch research requests from GitHub.
- **Installation**: Run `npm install node-cron` if not installed.

```javascript
const cron = require('node-cron');
const { fetchResearchRequests } = require('./path/to/github/api'); // Adjust path accordingly
// Set up the scheduler
cron.schedule('0 * * * *', async () => {
    const requests = await fetchResearchRequests();
    for (const request of requests) {
        await feedToAI(request); // Adjust with your function implementation
    }
});
```

