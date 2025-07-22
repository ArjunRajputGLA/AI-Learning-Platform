// import { NextRequest, NextResponse } from "next/server";
// import { MongoClient, ObjectId } from "mongodb";

// const uri = process.env.MONGODB_URI || "mongodb://localhost:27017";
// const client = new MongoClient(uri);

// async function connectToDatabase() {
//   try {
//     await client.connect();
//     const db = client.db("learning_platform");
//     return db.collection("Kanban");
//   } catch (error) {
//     console.error("Error connecting to MongoDB:", error);
//     throw new Error("Failed to connect to the database");
//   }
// }

// export async function GET(req: NextRequest) {
//   try {
//     const { searchParams } = new URL(req.url);
//     const userId = searchParams.get("userId");

//     if (!userId || typeof userId !== "string" || userId.trim() === "") {
//       return NextResponse.json(
//         { error: "Valid User ID is required" },
//         { status: 400 }
//       );
//     }

//     const collection = await connectToDatabase();
//     let kanbanBoard = await collection.findOne({ userId: userId });

//     if (!kanbanBoard) {
//       const defaultBoard = {
//         title: "My Kanban Board",
//         userId: userId,
//         relatedTrack: null,
//         columns: [
//           { id: "todo", title: "To-Do", tasks: [] },
//           { id: "inprogress", title: "In Progress", tasks: [] },
//           { id: "completed", title: "Completed", tasks: [] },
//         ],
//         createdAt: { $date: new Date().toISOString() },
//         updatedAt: { $date: new Date().toISOString() },
//       };

//       const result = await collection.insertOne(defaultBoard);
//       if (!result.insertedId) {
//         return NextResponse.json(
//           { error: "Failed to create Kanban board" },
//           { status: 500 }
//         );
//       }

//       kanbanBoard = await collection.findOne({ _id: result.insertedId });
//     }

//     if (!kanbanBoard) {
//       return NextResponse.json(
//         { error: "Kanban board not found" },
//         { status: 404 }
//       );
//     }

//     return NextResponse.json(kanbanBoard, { status: 200 });
//   } catch (error) {
//     console.error("Error fetching Kanban board:", error);
//     return NextResponse.json({ error: "Internal server error" }, { status: 500 });
//   }
// }

// export async function POST(req: NextRequest) {
//   try {
//     const { userId, columnId, title, description, priority, dueDate } = await req.json();

//     if (!userId || !columnId || !title) {
//       return NextResponse.json(
//         { error: "User ID, column ID, and title are required" },
//         { status: 400 }
//       );
//     }

//     const collection = await connectToDatabase();
//     const kanbanBoard = await collection.findOne({ userId: userId });

//     if (!kanbanBoard) {
//       return NextResponse.json(
//         { error: "Kanban board not found" },
//         { status: 404 }
//       );
//     }

//     if (!Array.isArray(kanbanBoard.columns)) {
//       return NextResponse.json(
//         { error: "Invalid Kanban board structure: columns must be an array" },
//         { status: 500 }
//       );
//     }

//     const targetColumn = kanbanBoard.columns.find(
//       (column: any) => column.id === columnId
//     );
//     if (!targetColumn) {
//       return NextResponse.json({ error: "Column not found" }, { status: 400 });
//     }

//     const newTask = {
//       id: new ObjectId().toString(),
//       title,
//       description: description || "",
//       priority: priority || "low",
//       dueDate: dueDate ? { $date: new Date(dueDate).toISOString() } : null,
//       completed: false,
//       createdAt: { $date: new Date().toISOString() },
//       columnId,
//     };

//     const updatedColumns = kanbanBoard.columns.map((column: any) => {
//       if (column.id === columnId) {
//         return { ...column, tasks: [...column.tasks, newTask] };
//       }
//       return column;
//     });

//     const result = await collection.updateOne(
//       { _id: kanbanBoard._id },
//       {
//         $set: {
//           columns: updatedColumns,
//           updatedAt: { $date: new Date().toISOString() },
//         },
//       }
//     );

//     if (result.modifiedCount === 0) {
//       return NextResponse.json({ error: "Failed to add task" }, { status: 500 });
//     }

//     return NextResponse.json(
//       {
//         message: "Task added successfully",
//         task: newTask,
//       },
//       { status: 200 }
//     );
//   } catch (error) {
//     console.error("Error adding task:", error);
//     return NextResponse.json({ error: "Internal server error" }, { status: 500 });
//   }
// }

// export async function PATCH(req: NextRequest) {
//   try {
//     const { userId, taskId, sourceColumnId, destinationColumnId } = await req.json();

//     if (!userId || !taskId || !sourceColumnId || !destinationColumnId) {
//       return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
//     }

//     const collection = await connectToDatabase();
//     const kanbanBoard = await collection.findOne({
//       $or: [{ userId: new ObjectId(userId) }, { userId: userId }],
//     });

//     if (!kanbanBoard) {
//       return NextResponse.json({ error: "Kanban board not found" }, { status: 404 });
//     }

//     let taskToMove: any = null;
//     const sourceColumn = kanbanBoard.columns.find((col: any) => col.id === sourceColumnId);
//     if (sourceColumn) {
//       taskToMove = sourceColumn.tasks.find((task: any) =>
//         (typeof task.id === "string" ? task.id : task.id.$oid) === taskId
//       );
//     }

//     if (!taskToMove) {
//       return NextResponse.json({ error: "Task not found" }, { status: 404 });
//     }

//     const updatedColumns = kanbanBoard.columns.map((column: any) => {
//       if (column.id === sourceColumnId) {
//         return {
//           ...column,
//           tasks: column.tasks.filter((task: any) =>
//             (typeof task.id === "string" ? task.id : task.id.$oid) !== taskId
//           ),
//         };
//       }
//       if (column.id === destinationColumnId) {
//         return {
//           ...column,
//           tasks: [...column.tasks, taskToMove],
//         };
//       }
//       return column;
//     });

//     const result = await collection.updateOne(
//       { _id: kanbanBoard._id },
//       {
//         $set: {
//           columns: updatedColumns,
//           updatedAt: { $date: new Date().toISOString() },
//         },
//       }
//     );

//     if (result.modifiedCount === 0) {
//       return NextResponse.json({ error: "Failed to update task position" }, { status: 500 });
//     }

//     return NextResponse.json({ message: "Task position updated successfully" }, { status: 200 });
//   } catch (error) {
//     console.error("Error updating task position:", error);
//     return NextResponse.json({ error: "Internal server error" }, { status: 500 });
//   }
// }

// export async function PUT(req: NextRequest) {
//   try {
//     const { userId, taskId, columnId, title, description, priority, dueDate } = await req.json();

//     // Validate required fields
//     if (!userId || !taskId || !columnId || !title) {
//       return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
//     }

//     // Validate userId format
//     let userIdQuery;
//     try {
//       if (typeof userId === "string" && /^[0-9a-fA-F]{24}$/.test(userId)) {
//         userIdQuery = { $or: [{ userId: userId }, { userId: new ObjectId(userId) }] };
//       } else {
//         userIdQuery = { userId: userId };
//       }
//     } catch (error) {
//       console.error("Invalid userId format:", userId);
//       return NextResponse.json({ error: "Invalid User ID format" }, { status: 400 });
//     }

//     const collection = await connectToDatabase();

//     // Find the Kanban board
//     const kanbanBoard = await collection.findOne(userIdQuery);
//     if (!kanbanBoard) {
//       return NextResponse.json({ error: "Kanban board not found" }, { status: 404 });
//     }

//     // Format date properly if it exists
//     const formattedDueDate = dueDate ? { $date: new Date(dueDate).toISOString() } : null;

//     // Update query to match the task in the specified column
//     const updateQuery = {
//       ...userIdQuery,
//       "columns.id": columnId,
//     };

//     // Update data for the specific task
//     const updateData = {
//       $set: {
//         "columns.$[column].tasks.$[task].title": title,
//         "columns.$[column].tasks.$[task].description": description || "",
//         "columns.$[column].tasks.$[task].priority": priority || "low",
//         "columns.$[column].tasks.$[task].dueDate": formattedDueDate,
//         "columns.$[column].tasks.$[task].updatedAt": { $date: new Date().toISOString() },
//         updatedAt: { $date: new Date().toISOString() },
//       },
//     };

//     // Array filters to target the specific column and task
//     const options = {
//       arrayFilters: [
//         { "column.id": columnId },
//         {
//           $or: [
//             { "task.id": taskId },
//             { "task.id.$oid": taskId },
//           ],
//         },
//       ],
//     };

//     const result = await collection.updateOne(updateQuery, updateData, options);

//     if (result.matchedCount === 0) {
//       return NextResponse.json({ error: "Kanban board or column not found" }, { status: 404 });
//     }

//     if (result.modifiedCount === 0) {
//       return NextResponse.json({ error: "No changes made to the task" }, { status: 400 });
//     }

//     return NextResponse.json({ message: "Task updated successfully" }, { status: 200 });
//   } catch (error) {
//     console.error("Error updating task:", error);
//     return NextResponse.json({ error: "Internal server error" }, { status: 500 });
//   }
// }

// export async function DELETE(req: NextRequest) {
//   try {
//     const body = await req.json();
//     const { userId, taskId, columnId } = body;

//     if (!userId || !taskId || !columnId) {
//       return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
//     }

//     const collection = await connectToDatabase();
    
//     const result = await collection.updateOne(
//       { 
//         userId: userId,
//         "columns.id": columnId 
//       },
//       { 
//         $pull: { 
//           "columns.$.tasks": {
//             $or: [
//               { id: taskId },
//               { "id.$oid": taskId },
//             ],
//           }
//         }
//       }
//     );

//     if (result.modifiedCount === 0) {
//       return NextResponse.json({ error: "Failed to delete task" }, { status: 404 });
//     }

//     return NextResponse.json({ message: "Task deleted successfully" });
//   } catch (error) {
//     console.error("Error deleting task:", error);
//     return NextResponse.json({ error: "Internal server error" }, { status: 500 });
//   }
// }

import { NextRequest, NextResponse } from "next/server";
import { MongoClient, ObjectId } from "mongodb";

const uri = process.env.MONGODB_URI || "mongodb://localhost:27017";
const client = new MongoClient(uri);

async function connectToDatabase() {
  try {
    await client.connect();
    const db = client.db("learning_platform");
    return db.collection("Kanban");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    throw new Error("Failed to connect to the database");
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { userId, taskId, sourceColumnId, destinationColumnId } = await req.json();

    // Validate required fields
    if (!userId || !taskId || !sourceColumnId || !destinationColumnId) {
      return NextResponse.json(
        { error: "Missing required fields: userId, taskId, sourceColumnId, and destinationColumnId are required" },
        { status: 400 }
      );
    }

    // Validate userId format (assuming it's a string from next-auth)
    if (typeof userId !== "string" || userId.trim() === "") {
      return NextResponse.json({ error: "Invalid userId format" }, { status: 400 });
    }

    const collection = await connectToDatabase();
    
    // Find the Kanban board
    const kanbanBoard = await collection.findOne({ userId });
    if (!kanbanBoard) {
      return NextResponse.json({ error: "Kanban board not found" }, { status: 404 });
    }

    // Validate source and destination columns
    const sourceColumn = kanbanBoard.columns.find((col: any) => col.id === sourceColumnId);
    const destinationColumn = kanbanBoard.columns.find((col: any) => col.id === destinationColumnId);
    if (!sourceColumn) {
      return NextResponse.json({ error: `Source column '${sourceColumnId}' not found` }, { status: 400 });
    }
    if (!destinationColumn) {
      return NextResponse.json({ error: `Destination column '${destinationColumnId}' not found` }, { status: 400 });
    }

    // Find the task to move
    let taskToMove: any = null;
    const taskIndex = sourceColumn.tasks.findIndex((task: any) =>
      (typeof task.id === "string" ? task.id : task.id.$oid) === taskId
    );
    if (taskIndex === -1) {
      return NextResponse.json({ error: `Task '${taskId}' not found in source column` }, { status: 404 });
    }
    taskToMove = sourceColumn.tasks[taskIndex];

    // Update columns: remove task from source and add to destination
    const updatedColumns = kanbanBoard.columns.map((column: any) => {
      if (column.id === sourceColumnId) {
        return {
          ...column,
          tasks: column.tasks.filter((_: any, index: number) => index !== taskIndex),
        };
      }
      if (column.id === destinationColumnId) {
        return {
          ...column,
          tasks: [...column.tasks, taskToMove],
        };
      }
      return column;
    });

    // Update the database
    const result = await collection.updateOne(
      { _id: kanbanBoard._id },
      {
        $set: {
          columns: updatedColumns,
          updatedAt: { $date: new Date().toISOString() },
        },
      }
    );

    if (result.modifiedCount === 0) {
      return NextResponse.json(
        { error: "Failed to update task position: no changes made" },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: "Task moved successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error moving task:", error);
    return NextResponse.json(
      { error: `Internal server error: ${error.message || "Unknown error"}` },
      { status: 500 }
    );
  }
}

// Include other routes (GET, POST, PUT, DELETE) unchanged
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId || typeof userId !== "string" || userId.trim() === "") {
      return NextResponse.json(
        { error: "Valid User ID is required" },
        { status: 400 }
      );
    }

    const collection = await connectToDatabase();
    let kanbanBoard = await collection.findOne({ userId: userId });

    if (!kanbanBoard) {
      const defaultBoard = {
        title: "My Kanban Board",
        userId: userId,
        relatedTrack: null,
        columns: [
          { id: "todo", title: "To-Do", tasks: [] },
          { id: "inprogress", title: "In Progress", tasks: [] },
          { id: "completed", title: "Completed", tasks: [] },
        ],
        createdAt: { $date: new Date().toISOString() },
        updatedAt: { $date: new Date().toISOString() },
      };

      const result = await collection.insertOne(defaultBoard);
      if (!result.insertedId) {
        return NextResponse.json(
          { error: "Failed to create Kanban board" },
          { status: 500 }
        );
      }

      kanbanBoard = await collection.findOne({ _id: result.insertedId });
    }

    if (!kanbanBoard) {
      return NextResponse.json(
        { error: "Kanban board not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(kanbanBoard, { status: 200 });
  } catch (error) {
    console.error("Error fetching Kanban board:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId, columnId, title, description, priority, dueDate } = await req.json();

    if (!userId || !columnId || !title) {
      return NextResponse.json(
        { error: "User ID, column ID, and title are required" },
        { status: 400 }
      );
    }

    const collection = await connectToDatabase();
    const kanbanBoard = await collection.findOne({ userId: userId });

    if (!kanbanBoard) {
      return NextResponse.json(
        { error: "Kanban board not found" },
        { status: 404 }
      );
    }

    if (!Array.isArray(kanbanBoard.columns)) {
      return NextResponse.json(
        { error: "Invalid Kanban board structure: columns must be an array" },
        { status: 500 }
      );
    }

    const targetColumn = kanbanBoard.columns.find(
      (column: any) => column.id === columnId
    );
    if (!targetColumn) {
      return NextResponse.json({ error: "Column not found" }, { status: 400 });
    }

    const newTask = {
      id: new ObjectId().toString(),
      title,
      description: description || "",
      priority: priority || "low",
      dueDate: dueDate ? { $date: new Date(dueDate).toISOString() } : null,
      completed: false,
      createdAt: { $date: new Date().toISOString() },
      columnId,
    };

    const updatedColumns = kanbanBoard.columns.map((column: any) => {
      if (column.id === columnId) {
        return { ...column, tasks: [...column.tasks, newTask] };
      }
      return column;
    });

    const result = await collection.updateOne(
      { _id: kanbanBoard._id },
      {
        $set: {
          columns: updatedColumns,
          updatedAt: { $date: new Date().toISOString() },
        },
      }
    );

    if (result.modifiedCount === 0) {
      return NextResponse.json({ error: "Failed to add task" }, { status: 500 });
    }

    return NextResponse.json(
      {
        message: "Task added successfully",
        task: newTask,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error adding task:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { userId, taskId, columnId, title, description, priority, dueDate } = await req.json();

    // Validate required fields
    if (!userId || !taskId || !columnId || !title) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Validate userId format
    let userIdQuery;
    try {
      if (typeof userId === "string" && /^[0-9a-fA-F]{24}$/.test(userId)) {
        userIdQuery = { $or: [{ userId: userId }, { userId: new ObjectId(userId) }] };
      } else {
        userIdQuery = { userId: userId };
      }
    } catch (error) {
      console.error("Invalid userId format:", userId);
      return NextResponse.json({ error: "Invalid User ID format" }, { status: 400 });
    }

    const collection = await connectToDatabase();

    // Find the Kanban board
    const kanbanBoard = await collection.findOne(userIdQuery);
    if (!kanbanBoard) {
      return NextResponse.json({ error: "Kanban board not found" }, { status: 404 });
    }

    // Format date properly if it exists
    const formattedDueDate = dueDate ? { $date: new Date(dueDate).toISOString() } : null;

    // Update query to match the task in the specified column
    const updateQuery = {
      ...userIdQuery,
      "columns.id": columnId,
    };

    // Update data for the specific task
    const updateData = {
      $set: {
        "columns.$[column].tasks.$[task].title": title,
        "columns.$[column].tasks.$[task].description": description || "",
        "columns.$[column].tasks.$[task].priority": priority || "low",
        "columns.$[column].tasks.$[task].dueDate": formattedDueDate,
        "columns.$[column].tasks.$[task].updatedAt": { $date: new Date().toISOString() },
        updatedAt: { $date: new Date().toISOString() },
      },
    };

    // Array filters to target the specific column and task
    const options = {
      arrayFilters: [
        { "column.id": columnId },
        {
          $or: [
            { "task.id": taskId },
            { "task.id.$oid": taskId },
          ],
        },
      ],
    };

    const result = await collection.updateOne(updateQuery, updateData, options);

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Kanban board or column not found" }, { status: 404 });
    }

    if (result.modifiedCount === 0) {
      return NextResponse.json({ error: "No changes made to the task" }, { status: 400 });
    }

    return NextResponse.json({ message: "Task updated successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error updating task:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, taskId, columnId } = body;

    if (!userId || !taskId || !columnId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const collection = await connectToDatabase();
    
    const result = await collection.updateOne(
      { 
        userId: userId,
        "columns.id": columnId 
      },
      { 
        $pull: { 
          "columns.$.tasks": {
            $or: [
              { id: taskId },
              { "id.$oid": taskId },
            ],
          }
        }
      }
    );

    if (result.modifiedCount === 0) {
      return NextResponse.json({ error: "Failed to delete task" }, { status: 404 });
    }

    return NextResponse.json({ message: "Task deleted successfully" });
  } catch (error) {
    console.error("Error deleting task:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}