// Test file to verify RBAC implementation
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

// Test user data
const testUsers = {
  student: {
    id: 'student123',
    email: 'student@example.com',
    role: 'student'
  },
  organizer: {
    id: 'organizer123',
    email: 'organizer@example.com',
    role: 'organizer'
  },
  admin: {
    id: 'admin123',
    email: 'admin@example.com',
    role: 'admin'
  }
};

// JWT secret (should match the one in server.js)
const JWT_SECRET = process.env.JWT_SECRET || 'campus_event_hub_secret_key';

// Function to generate test tokens
function generateTestTokens() {
  const tokens = {};
  
  for (const [role, userData] of Object.entries(testUsers)) {
    const token = jwt.sign(
      { 
        id: userData.id, 
        email: userData.email, 
        role: userData.role 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    tokens[role] = token;
    console.log(`${role.charAt(0).toUpperCase() + role.slice(1)} token:`, token);
  }
  
  return tokens;
}

// Function to test role checking logic
function testRoleChecking() {
  console.log('\n=== Role Checking Tests ===');
  
  // Test cases: [userRole, requiredRoles, expectedResult]
  const testCases = [
    // Student tests
    ['student', ['student'], true],
    ['student', ['organizer'], false],
    ['student', ['admin'], false],
    ['student', ['student', 'organizer'], true],
    ['student', ['organizer', 'admin'], false],
    
    // Organizer tests
    ['organizer', ['organizer'], true],
    ['organizer', ['admin'], false],
    ['organizer', ['student'], false],
    ['organizer', ['organizer', 'admin'], true],
    ['organizer', ['student', 'admin'], false],
    
    // Admin tests
    ['admin', ['admin'], true],
    ['admin', ['organizer'], false],
    ['admin', ['student'], false],
    ['admin', ['organizer', 'admin'], true],
    ['admin', ['student', 'organizer'], false],
    ['admin', ['student', 'organizer', 'admin'], true],
    
    // Guest tests
    ['guest', ['guest'], true],
    ['guest', ['student'], false],
    ['guest', ['organizer'], false],
    ['guest', ['admin'], false],
    ['guest', ['student', 'organizer'], false],
  ];
  
  testCases.forEach(([userRole, requiredRoles, expectedResult], index) => {
    const result = requiredRoles.includes(userRole);
    const status = result === expectedResult ? 'PASS' : 'FAIL';
    console.log(`${index + 1}. User: ${userRole}, Required: [${requiredRoles.join(', ')}] => ${result} (${status})`);
  });
}

// Function to test ownership verification logic
function testOwnershipVerification() {
  console.log('\n=== Ownership Verification Tests ===');
  
  const testEvent = {
    _id: 'event123',
    title: 'Test Event',
    organizer: 'organizer@example.com'
  };
  
  const users = {
    organizer: { email: 'organizer@example.com', role: 'organizer' },
    otherOrganizer: { email: 'other@example.com', role: 'organizer' },
    admin: { email: 'admin@example.com', role: 'admin' },
    student: { email: 'student@example.com', role: 'student' }
  };
  
  // Test cases: [user, action, expectedResult]
  const ownershipTests = [
    [users.organizer, 'edit', true],
    [users.organizer, 'delete', true],
    [users.otherOrganizer, 'edit', false],
    [users.otherOrganizer, 'delete', false],
    [users.admin, 'edit', true],
    [users.admin, 'delete', true],
    [users.student, 'edit', false],
    [users.student, 'delete', false]
  ];
  
  ownershipTests.forEach(([user, action, expectedResult], index) => {
    let result;
    if (user.role === 'admin') {
      result = true; // Admins can always edit/delete
    } else {
      result = user.email === testEvent.organizer; // Organizers can only edit their own events
    }
    
    const status = result === expectedResult ? 'PASS' : 'FAIL';
    console.log(`${index + 1}. ${user.role} (${user.email}) ${action} event => ${result} (${status})`);
  });
}

// Run tests
console.log('=== Campus Event Hub RBAC Test ===');
generateTestTokens();
testRoleChecking();
testOwnershipVerification();
console.log('\n=== Test Complete ===');