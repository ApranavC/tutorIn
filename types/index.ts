export interface Course {
    id: string;
    name: string;
    code: string;
    teacherId: string;
    teacherEmail?: string;
    teacherName?: string;
    studentIds: string[];
    createdAt: string;
}

export interface ClassSession {
    id: string;
    title: string;
    roomId: string;
    status: 'active' | 'ended';
    createdAt: string;
    courseId?: string;
    courseName?: string;
    notes?: { url: string; name: string }[];
    attendance?: { uid: string; name: string; timestamp: string }[];
    timeline?: { name: string; duration: number; events: { start: string; end: string }[] }[];
}

export interface Doubt {
    id: string;
    studentId: string;
    studentName: string;
    teacherId: string;
    courseId: string;
    courseName: string;
    text: string;
    replyText?: string;
    status: 'pending' | 'resolved';
    createdAt: string;
    dateAsked: string;
}

export interface UserProfile {
    uid: string;
    email: string;
    role: string;
    displayName?: string;
}

export interface Quiz {
    id: string;
    courseId: string;
    teacherId: string;
    title: string;
    questions: {
        question: string;
        options: string[];
        correctIndex: number;
    }[];
    createdAt: string;
}

export interface Assignment {
    id: string;
    courseId: string;
    teacherId: string;
    title: string;
    description: string;
    dueDate: string;
    createdAt: string;
}

export interface Submission {
    id: string;
    courseId: string;
    studentId: string;
    studentName: string;
    itemId: string;
    type: 'quiz' | 'assignment';
    score: number;
    content?: string;
    createdAt: string;
}
