import { describe, it, expect } from "vitest";
import type {
  Course,
  ClassSession,
  Doubt,
  Quiz,
  Submission,
} from "@/types";

describe("Shared types (types/index.ts)", () => {
  it("Course type has all required fields", () => {
    const course: Course = {
      id: "c1",
      name: "Math",
      code: "MATH101",
      teacherId: "t1",
      studentIds: ["s1", "s2"],
      createdAt: "2024-01-01T00:00:00Z",
    };
    expect(course.id).toBe("c1");
    expect(course.studentIds).toHaveLength(2);
  });

  it("ClassSession type supports optional fields", () => {
    const cls: ClassSession = {
      id: "cls1",
      title: "Lecture 1",
      roomId: "room1",
      status: "active",
      createdAt: "2024-01-01T00:00:00Z",
    };
    expect(cls.notes).toBeUndefined();
    expect(cls.attendance).toBeUndefined();
    expect(cls.timeline).toBeUndefined();
  });

  it("Doubt type supports pending and resolved status", () => {
    const pending: Doubt = {
      id: "d1",
      studentId: "s1",
      studentName: "Alice",
      teacherId: "t1",
      courseId: "c1",
      courseName: "Math",
      text: "What is calculus?",
      status: "pending",
      createdAt: "2024-01-01T00:00:00Z",
      dateAsked: "2024-01-01",
    };
    expect(pending.status).toBe("pending");
    expect(pending.replyText).toBeUndefined();

    const resolved: Doubt = {
      ...pending,
      status: "resolved",
      replyText: "Calculus is the study of change.",
    };
    expect(resolved.status).toBe("resolved");
    expect(resolved.replyText).toBeDefined();
  });

  it("Quiz type has questions with correct structure", () => {
    const quiz: Quiz = {
      id: "q1",
      courseId: "c1",
      teacherId: "t1",
      title: "Chapter 1 Quiz",
      questions: [
        { question: "What is 1+1?", options: ["1", "2", "3"], correctIndex: 1 },
      ],
      createdAt: "2024-01-01T00:00:00Z",
    };
    expect(quiz.questions[0].correctIndex).toBe(1);
  });

  it("Submission type distinguishes quiz vs assignment", () => {
    const quizSub: Submission = {
      id: "sub1",
      courseId: "c1",
      studentId: "s1",
      studentName: "Alice",
      itemId: "q1",
      type: "quiz",
      score: 85,
      createdAt: "2024-01-01T00:00:00Z",
    };
    expect(quizSub.type).toBe("quiz");

    const assignSub: Submission = {
      ...quizSub,
      id: "sub2",
      type: "assignment",
      content: "My essay...",
    };
    expect(assignSub.type).toBe("assignment");
  });
});
