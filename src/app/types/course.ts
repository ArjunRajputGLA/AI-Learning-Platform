import { ObjectId } from "mongodb";

interface Resource {
  type: string;
  url: string;
  title: string;
}

interface Activity {
  type: string;
  content: string;
  title: string;
}

export interface CourseModule {
  moduleId: ObjectId;
  title: string;
  content: string;
  order: number;
  resources: Resource[];
  activities: Activity[];
}

export interface Course {
  _id?: ObjectId;
  title: string;
  description: string;
  createdBy: ObjectId;
  modules: CourseModule[];
  category: string;
  difficulty: string;
  duration: number;
  prerequisites: string[];
  objectives: string[];
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}
