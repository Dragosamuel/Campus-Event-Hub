// Test script to verify event creation and uniqueness
const { MongoClient, ObjectId } = require('mongodb');

async function testEventCreation() {
  try {
    // Connect to MongoDB
    const uri = process.env.MONGODB_URI || "mongodb://localhost:27017";
    const client = new MongoClient(uri);
    
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db('CampusEventHub');
    const eventsCollection = db.collection('events');
    
    // Create a test event
    const testEvent = {
      title: 'Test Event - ' + Date.now(),
      description: 'This is a test event to verify uniqueness',
      date: '2025-12-01',
      time: '14:00',
      location: 'Test Location',
      organizer: 'test@example.com',
      createdBy: 'test@example.com',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Insert the event
    const result = await eventsCollection.insertOne(testEvent);
    console.log('Event created with ID:', result.insertedId);
    
    // Verify the event exists
    const createdEvent = await eventsCollection.findOne({ _id: result.insertedId });
    console.log('Created event:', createdEvent.title);
    
    // Count total events
    const totalEvents = await eventsCollection.countDocuments();
    console.log('Total events in database:', totalEvents);
    
    // Count events with the same title
    const sameTitleCount = await eventsCollection.countDocuments({ title: testEvent.title });
    console.log('Events with same title:', sameTitleCount);
    
    // List all events
    const allEvents = await eventsCollection.find({}).toArray();
    console.log('\nAll events:');
    allEvents.forEach((event, index) => {
      console.log(`${index + 1}. ${event.title} (ID: ${event._id})`);
    });
    
    // Clean up - delete the test event
    await eventsCollection.deleteOne({ _id: result.insertedId });
    console.log('\nTest event cleaned up');
    
    await client.close();
    console.log('Disconnected from MongoDB');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testEventCreation();