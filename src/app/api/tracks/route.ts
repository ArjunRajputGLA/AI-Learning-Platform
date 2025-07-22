import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// Types based on your schema
interface Resource {
  type: 'video' | 'article' | 'document';
  url: string;
  title: string;
  duration?: number;
}

interface Activity {
  type: 'quiz' | 'assignment' | 'exercise';
  instructions: string;
  pointsValue: number;
}

interface Module {
  moduleId: string;
  title: string;
  content: string;
  order: number;
  resources: Resource[];
  activities: Activity[];
}

interface QuizQuestion {
  question: string;
  options: string[];
  correctOption: number;
  explanation: string;
}

interface Quiz {
  questions: QuizQuestion[];
  passingScore: number;
}

interface Track {
  _id?: string;
  title: string;
  description: string;
  thumbnail: string;
  createdBy: string;
  isPublic: boolean;
  subject: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedMinutes: number;
  prerequisites: string[];
  modules: Module[];
  quiz: Quiz;
  tags: string[];
}

interface TrackRequest {
  subject: string;
  topics: string[];
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
}

// FastAPI service URL for development
const FASTAPI_URL = 'http://127.0.0.1:8000';

// Fallback mock track for development
const generateMockTrack = (subject: string, topics: string[], difficulty: string): Track => ({
  title: `Mock ${subject} Course`,
  description: `This is a mock learning track for ${subject} covering ${topics.join(', ')}.`,
  thumbnail: `https://example.com/thumbnail/${subject.toLowerCase().replace(/\s+/g, '-')}.jpg`,
  createdBy: 'system',
  isPublic: true,
  subject,
  difficulty: difficulty as 'beginner' | 'intermediate' | 'advanced',
  estimatedMinutes: topics.length * 30,
  prerequisites: difficulty === 'beginner' ? [] : [`Basic understanding of ${subject}`],
  modules: topics.map((topic, index) => ({
    moduleId: new ObjectId().toString(),
    title: topic,
    content: `Mock content for ${topic}.\n\nExample equation: $$x^2 + y^2 = z^2$$`,
    order: index + 1,
    resources: [
      {
        type: 'article',
        url: 'https://example.com/resource',
        title: `Mock Resource for ${topic}`,
      },
    ],
    activities: [
      {
        type: 'quiz',
        instructions: `Answer mock quiz for ${topic}`,
        pointsValue: 10,
      },
    ],
  })),
  quiz: {
    questions: [
      {
        question: `What is a key concept in ${topics[0]}?`,
        options: ['Option A', 'Option B', 'Option C', 'Option D'],
        correctOption: 0,
        explanation: 'This is a mock explanation.',
      },
    ],
    passingScore: 80,
  },
  tags: [subject.toLowerCase(), difficulty, ...topics.map((t) => t.toLowerCase())],
});

async function generateTrackContent(subject: string, topics: string[], difficulty: string = 'beginner'): Promise<Track> {
  // Use mock data if environment variable is set
  if (process.env.USE_MOCK_TRACK === 'true') {
    console.log('Using mock track data');
    return generateMockTrack(subject, topics, difficulty);
  }

  const maxRetries = 2;
  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const startTime = Date.now();
      // Call FastAPI endpoint without timeout
      const response = await axios.post(`${FASTAPI_URL}/generate-curriculum`, {
        subject,
        topics,
      });

      const endTime = Date.now();
      console.log(`FastAPI response time: ${(endTime - startTime) / 1000} seconds`);

      const curriculum = response.data.curriculum;

      // Map FastAPI response to Track schema
      const modules: Module[] = curriculum.main_topics.map((mainTopic: any, index: number) => ({
        moduleId: new ObjectId().toString(),
        title: mainTopic.main_topic,
        content: mainTopic.subtopics.map((sub: any) => sub.comprehensive_notes).join('\n\n'),
        order: index + 1,
        resources: mainTopic.subtopics.flatMap((sub: any) =>
          sub.learning_urls.map((url: string, i: number) => ({
            type: 'article' as const,
            url,
            title: `Resource ${i + 1} for ${sub.subtopic}`,
          }))
        ),
        activities: mainTopic.subtopics.flatMap((sub: any) =>
          sub.quiz.map((q: any, i: number) => ({
            type: 'quiz' as const,
            instructions: `Answer quiz question: ${q.question}`,
            pointsValue: 10,
          }))
        ),
      }));

      const quizQuestions: QuizQuestion[] = curriculum.final_quiz.map((q: any) => ({
        question: q.question,
        options: q.options,
        correctOption: q.correct_answer,
        explanation: q.explanation,
      }));

      const estimatedMinutes = modules.length * 30 + quizQuestions.length * 2;

      return {
        title: curriculum.course_title,
        description: curriculum.overview,
        thumbnail: `https://example.com/thumbnail/${subject.toLowerCase().replace(/\s+/g, '-')}.jpg`,
        createdBy: 'system',
        isPublic: true,
        subject,
        difficulty: difficulty as 'beginner' | 'intermediate' | 'advanced',
        estimatedMinutes,
        prerequisites: difficulty === 'beginner' ? [] : [`Basic understanding of ${subject}`],
        modules,
        quiz: {
          questions: quizQuestions,
          passingScore: 80,
        },
        tags: [
          subject.toLowerCase(),
          difficulty,
          ...topics.map((topic) => topic.toLowerCase()),
        ],
      };
    } catch (error: any) {
      lastError = error;
      console.error(`Attempt ${attempt} failed:`, {
        message: error.message,
        code: error.code,
        config: error.config?.url,
        response: error.response?.data,
      });
      if (attempt === maxRetries) break;
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Handle final error after retries
  if (lastError) {
    if (lastError.code === 'ECONNREFUSED') {
      throw new Error('Cannot connect to curriculum service. Ensure FastAPI is running on http://127.0.0.1:8000.');
    }
    throw new Error(`Failed to generate track: ${lastError.message}`);
  }

  throw new Error('Unexpected error generating track');
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body: TrackRequest = await request.json();

    // Validate request
    if (!body.subject || !body.topics || body.topics.length === 0) {
      return NextResponse.json(
        { error: 'Subject and topics are required' },
        { status: 400 }
      );
    }

    if (body.topics.length > 10) {
      return NextResponse.json(
        { error: 'Maximum 10 topics allowed' },
        { status: 400 }
      );
    }

    // Generate track content
    const track = await generateTrackContent(
      body.subject,
      body.topics,
      body.difficulty
    );

    // Set createdBy to authenticated user or 'system'
    const createdBy = session?.user?.id || 'system';

    // Save to MongoDB
    const { db } = await connectToDatabase('learning_platform');
    const tracksCollection = db.collection('Tracks');
    const insertResult = await tracksCollection.insertOne({
      ...track,
      createdBy: new ObjectId(createdBy),
      createdAt: new Date(),
      updatedAt: new Date(),
      modules: track.modules.map((module) => ({
        ...module,
        moduleId: new ObjectId(module.moduleId),
      })),
    });

    // Return the track with the inserted ID
    const insertedTrack: Track = {
      ...track,
      _id: insertResult.insertedId.toString(),
    };

    return NextResponse.json({
      success: true,
      track: insertedTrack,
      message: 'Track generated and saved successfully',
    });
  } catch (error: any) {
    console.error('Error generating track:', error.message);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const trackId = url.searchParams.get('id');

    const { db } = await connectToDatabase('learning_platform');
    const tracksCollection = db.collection('Tracks');

    if (trackId && ObjectId.isValid(trackId)) {
      // Fetch a single track by ID
      const track = await tracksCollection.findOne({
        _id: new ObjectId(trackId),
        createdBy: new ObjectId(session.user.id),
      });

      if (!track) {
        return NextResponse.json(
          { error: 'Track not found or not owned by user' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        track: {
          ...track,
          _id: track._id.toString(),
          createdBy: track.createdBy.toString(),
          modules: track.modules.map((module: any) => ({
            ...module,
            moduleId: module.moduleId.toString(),
          })),
        },
      });
    } else {
      // Fetch all user tracks
      const userTracks = await tracksCollection
        .find({ createdBy: new ObjectId(session.user.id) })
        .project({
          _id: 1,
          title: 1,
          subject: 1,
          difficulty: 1,
          createdAt: 1,
        })
        .sort({ createdAt: -1 })
        .toArray();

      return NextResponse.json({
        success: true,
        tracks: userTracks.map((track) => ({
          _id: track._id.toString(),
          title: track.title,
          subject: track.subject,
          difficulty: track.difficulty,
          createdAt: track.createdAt,
        })),
      });
    }
  } catch (error: any) {
    console.error('Error fetching tracks:', error.message);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const trackId = url.searchParams.get('id');

    if (!trackId || !ObjectId.isValid(trackId)) {
      return NextResponse.json(
        { error: 'Invalid or missing track ID' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase('learning_platform');
    const tracksCollection = db.collection('Tracks');

    const track = await tracksCollection.findOne({
      _id: new ObjectId(trackId),
      createdBy: new ObjectId(session.user.id),
    });

    if (!track) {
      return NextResponse.json(
        { error: 'Track not found or not owned by user' },
        { status: 404 }
      );
    }

    await tracksCollection.deleteOne({ _id: new ObjectId(trackId) });

    return NextResponse.json({
      success: true,
      message: 'Track deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting track:', error.message);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}