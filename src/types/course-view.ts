import { course, courseMonth, courseWeek, assessment, projectSubmission } from "@/lib/db/schema";
import { InferSelectModel } from "drizzle-orm";

export type Assessment = InferSelectModel<typeof assessment> & {
    weekOrder?: number;
    weekTitle?: string;
    isLocked?: boolean;
};

export type ProjectSubmission = InferSelectModel<typeof projectSubmission>;

export type Week = InferSelectModel<typeof courseWeek> & {
    assessments: Assessment[];
    projectSubmissions?: ProjectSubmission[];
    lessonDescription: string | null;
    writtenExamples: string | null;
    isLocked?: boolean;
    isCompleted?: boolean;
};

export type Month = InferSelectModel<typeof courseMonth> & {
    weeks: Week[];
};

export type Course = InferSelectModel<typeof course> & {
    months: Month[];
    description: string | null;
};
