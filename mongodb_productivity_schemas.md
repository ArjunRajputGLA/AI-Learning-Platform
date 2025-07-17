# Simple MongoDB Schemas for Productivity Features

## 1. Kanban Boards Collection

```javascript
{
  _id: ObjectId,
  title: String,
  userId: ObjectId, // ref: Users
  relatedTrack: ObjectId, // ref: Tracks (optional)
  columns: [
    {
      id: String, // "todo", "doing", "done"
      title: String,
      tasks: [
        {
          id: ObjectId,
          title: String,
          description: String,
          priority: String, // "low", "medium", "high"
          dueDate: Date,
          completed: Boolean,
          createdAt: Date
        }
      ]
    }
  ],
  createdAt: Date,
  updatedAt: Date
}
```

## 2. Sticky Notes Collection

```javascript
{
  _id: ObjectId,
  content: String,
  userId: ObjectId, // ref: Users
  color: String, // "yellow", "blue", "green", "pink"
  position: {
    x: Number,
    y: Number
  },
  relatedTo: {
    type: String, // "track", "meeting", "general"
    id: ObjectId // reference to track/meeting
  },
  createdAt: Date,
  updatedAt: Date
}
```

## 3. Todo Lists Collection

```javascript
{
  _id: ObjectId,
  title: String,
  userId: ObjectId, // ref: Users
  relatedTrack: ObjectId, // ref: Tracks (optional)
  tasks: [
    {
      id: ObjectId,
      title: String,
      completed: Boolean,
      priority: String, // "low", "medium", "high"
      dueDate: Date,
      createdAt: Date,
      completedAt: Date
    }
  ],
  createdAt: Date,
  updatedAt: Date
}
```

## Simple API Endpoints

### Kanban Board Endpoints
```
GET    /api/kanban                     // Get user's boards
POST   /api/kanban                     // Create board
GET    /api/kanban/:id                 // Get specific board
PUT    /api/kanban/:id                 // Update board
DELETE /api/kanban/:id                 // Delete board
POST   /api/kanban/:id/task            // Add task
PUT    /api/kanban/:id/task/:taskId    // Update task
DELETE /api/kanban/:id/task/:taskId    // Delete task
```

### Sticky Notes Endpoints
```
GET    /api/sticky                     // Get user's notes
POST   /api/sticky                     // Create note
PUT    /api/sticky/:id                 // Update note
DELETE /api/sticky/:id                 // Delete note
```

### Todo List Endpoints
```
GET    /api/todos                      // Get user's todo lists
POST   /api/todos                      // Create todo list
GET    /api/todos/:id                  // Get specific list
PUT    /api/todos/:id                  // Update list
DELETE /api/todos/:id                  // Delete list
POST   /api/todos/:id/task             // Add task
PUT    /api/todos/:id/task/:taskId     // Update task
DELETE /api/todos/:id/task/:taskId     // Delete task
```

## Usage Examples

### Simple Kanban Board
```javascript
{
  title: "My Study Board",
  userId: ObjectId("user123"),
  relatedTrack: ObjectId("track456"),
  columns: [
    {
      id: "todo",
      title: "To Do",
      tasks: [
        {
          title: "Read Chapter 1",
          description: "Introduction to JavaScript",
          priority: "high",
          dueDate: "2024-01-15",
          completed: false
        }
      ]
    },
    {
      id: "doing", 
      title: "In Progress",
      tasks: []
    },
    {
      id: "done",
      title: "Done",
      tasks: []
    }
  ]
}
```

### Simple Sticky Note
```javascript
{
  content: "Remember to review arrays tomorrow!",
  userId: ObjectId("user123"),
  color: "yellow",
  position: { x: 100, y: 200 },
  relatedTo: {
    type: "track",
    id: ObjectId("track456")
  }
}
```

### Simple Todo List
```javascript
{
  title: "JavaScript Learning Tasks",
  userId: ObjectId("user123"),
  relatedTrack: ObjectId("track456"),
  tasks: [
    {
      title: "Complete variables exercise",
      completed: false,
      priority: "high",
      dueDate: "2024-01-15"
    },
    {
      title: "Watch function tutorial",
      completed: true,
      priority: "medium",
      completedAt: "2024-01-10"
    }
  ]
}
```

## Integration Notes

1. **Link to Learning**: Use `relatedTrack` to connect boards and todos to learning tracks
2. **User-Specific**: All items belong to specific users via `userId`
3. **Simple Colors**: Sticky notes use predefined color names
4. **Basic Priority**: Three priority levels (low, medium, high)
5. **Optional Due Dates**: Add deadlines when needed

This simplified approach makes implementation much easier while still providing all the essential productivity features your learning platform needs.