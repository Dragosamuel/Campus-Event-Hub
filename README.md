# Campus Event Hub

A web-based system for managing campus events with features for event creation, registration, and management.

## Features

- Event creation and management
- User registration (students and organizers)
- Event registration with free and paid options
- Email notifications for upcoming events
- Media support (images and videos for events)
- Responsive design for all devices

## Technologies Used

- Node.js
- Express.js
- MongoDB
- EJS (Embedded JavaScript templating)
- HTML5, CSS3, JavaScript
- Nodemailer for email notifications
- Multer for file uploads

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/campus-event-hub.git
   ```

2. Navigate to the project directory:
   ```bash
   cd campus-event-hub
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Create a `.env` file in the root directory with the following variables:
   ```env
   PORT=3000
   MONGODB_URI=mongodb://localhost:27017/CampusEventHub
   EMAIL_HOST=smtp.ethereal.email
   EMAIL_PORT=587
   EMAIL_SECURE=false
   EMAIL_USER=your-email@example.com
   EMAIL_PASS=your-email-password
   JWT_SECRET=your-jwt-secret
   ```

5. Start the server:
   ```bash
   npm start
   ```

6. Open your browser and navigate to `http://localhost:3000`

## Deployment

This application can be deployed to various platforms including:

- Heroku
- AWS Elastic Beanstalk
- DigitalOcean App Platform
- Google Cloud Run
- Azure App Service

### Heroku Deployment

1. Create a Heroku account and install the Heroku CLI
2. Login to Heroku:
   ```bash
   heroku login
   ```
3. Create a new Heroku app:
   ```bash
   heroku create your-app-name
   ```
4. Set environment variables:
   ```bash
   heroku config:set MONGODB_URI=your-mongodb-uri
   heroku config:set JWT_SECRET=your-jwt-secret
   ```
5. Deploy the app:
   ```bash
   git push heroku main
   ```

## Contributing

1. Fork the repository
2. Create a new branch:
   ```bash
   git checkout -b feature-branch
   ```
3. Make your changes and commit them:
   ```bash
   git commit -m "Add new feature"
   ```
4. Push to the branch:
   ```bash
   git push origin feature-branch
   ```
5. Create a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.