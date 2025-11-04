# Deployment Guide

This guide will help you deploy the Campus Event Hub application to various platforms.

## Prerequisites

Before deploying, ensure you have:

1. A GitHub account
2. A MongoDB database (MongoDB Atlas recommended for cloud deployments)
3. An email service account (for email notifications)
4. Node.js and npm installed locally (for testing)

## Environment Variables

You'll need to set the following environment variables for the application to work properly:

```
PORT=3000
MONGODB_URI=your-mongodb-connection-string
EMAIL_HOST=your-email-host
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email-user
EMAIL_PASS=your-email-password
JWT_SECRET=your-jwt-secret-key
```

## Deployment Options

### 1. Heroku Deployment

1. Create a Heroku account at https://heroku.com
2. Install the Heroku CLI: https://devcenter.heroku.com/articles/heroku-cli
3. Login to Heroku CLI:
   ```bash
   heroku login
   ```
4. Create a new Heroku app:
   ```bash
   heroku create your-app-name
   ```
5. Set environment variables:
   ```bash
   heroku config:set MONGODB_URI=your-mongodb-uri
   heroku config:set JWT_SECRET=your-jwt-secret
   heroku config:set EMAIL_HOST=your-email-host
   heroku config:set EMAIL_USER=your-email-user
   heroku config:set EMAIL_PASS=your-email-password
   ```
6. Deploy the app:
   ```bash
   git push heroku main
   ```
7. Open the app:
   ```bash
   heroku open
   ```

### 2. DigitalOcean App Platform

1. Create a DigitalOcean account at https://digitalocean.com
2. Create a new App in the DigitalOcean control panel
3. Connect your GitHub repository
4. Set environment variables in the app settings
5. Deploy the app

### 3. AWS Elastic Beanstalk

1. Create an AWS account at https://aws.amazon.com
2. Install the Elastic Beanstalk CLI: https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/eb-cli3-install.html
3. Initialize the EB application:
   ```bash
   eb init
   ```
4. Create and deploy the environment:
   ```bash
   eb create
   eb deploy
   ```

### 4. Google Cloud Run

1. Create a Google Cloud account at https://cloud.google.com
2. Install the Google Cloud SDK: https://cloud.google.com/sdk/docs/install
3. Build and push the Docker image:
   ```bash
   gcloud builds submit --tag gcr.io/PROJECT-ID/campus-event-hub
   ```
4. Deploy to Cloud Run:
   ```bash
   gcloud run deploy --image gcr.io/PROJECT-ID/campus-event-hub
   ```

## MongoDB Setup

For production, it's recommended to use MongoDB Atlas:

1. Create a MongoDB Atlas account at https://www.mongodb.com/cloud/atlas
2. Create a new cluster
3. Add a database user
4. Add your deployment IP to the IP whitelist (or allow access from anywhere for development)
5. Get the connection string and use it as your MONGODB_URI

## Email Service Setup

For email notifications, you can use:

1. Gmail SMTP:
   - EMAIL_HOST: smtp.gmail.com
   - EMAIL_PORT: 587
   - EMAIL_SECURE: false
   - EMAIL_USER: your-gmail-address@gmail.com
   - EMAIL_PASS: your-app-password

2. SendGrid:
   - EMAIL_HOST: smtp.sendgrid.net
   - EMAIL_PORT: 587
   - EMAIL_SECURE: false
   - EMAIL_USER: apikey
   - EMAIL_PASS: your-sendgrid-api-key

3. Ethereal (for testing):
   - Visit https://ethereal.email/create to create a test account
   - Use the provided credentials

## Testing the Deployment

After deployment, test the following:

1. Access the main page
2. Create a new event
3. Register for an event as a student (free registration)
4. Register for an event as a non-student (paid registration)
5. Complete the payment process
6. Check email notifications
7. View event details with images and videos

## Troubleshooting

Common issues and solutions:

1. **Application crashes on startup**:
   - Check environment variables are set correctly
   - Verify MongoDB connection string
   - Check logs for error messages

2. **Email notifications not working**:
   - Verify email service credentials
   - Check spam/junk folder
   - Ensure email service allows sending from your deployment IP

3. **File uploads not working**:
   - Check file size limits
   - Verify upload directory permissions
   - Check available disk space

4. **Database connection issues**:
   - Verify MongoDB URI format
   - Check network connectivity
   - Ensure database user has proper permissions

## Monitoring and Maintenance

1. Set up logging to monitor application performance
2. Regularly backup your MongoDB database
3. Monitor email service usage and limits
4. Keep dependencies updated for security patches
5. Monitor disk space usage for file uploads