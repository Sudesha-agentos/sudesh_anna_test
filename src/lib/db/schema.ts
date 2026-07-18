import { relations } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  boolean,
  index,
  integer,
  json,
} from "drizzle-orm/pg-core";

// ===============USERS=================

// ===============USERS=================

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  role: text("role", {
    enum: ["admin", "mentor", "student", "recruiter", "partner_agency"],
  })
    .default("student")
    .notNull(),
  isRecruiterVisible: boolean("is_recruiter_visible").default(false).notNull(),
  totalScore: integer("total_score").default(0).notNull(),
  bio: text("bio"),
  githubUrl: text("github_url"),
  linkedinUrl: text("linkedin_url"),
  websiteUrl: text("website_url"),
  twitterUrl: text("twitter_url"),
  contactEmail: text("contact_email"),
  resumeUrl: text("resume_url"), // Link to resume (PDF/Drive)
  topProjects: json("top_projects").$type<string[]>(), // Array of project submission IDs
  phone: text("phone"),
  city: text("city"),
  studentStatus: text("student_status", { enum: ["College Student", "Working Professional"] }),
  preferredTrack: text("preferred_track"),
  collegeName: text("college_name"),
  message: text("message"),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

// ... (session, account, verification tables remain same)

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)]
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)]
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)]
);

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  enrollments: many(enrollment),
  internshipEnrollments: many(internshipEnrollment),
  progress: many(studentProgress),
  assessmentResponses: many(assessmentResponse),
  projectSubmissions: many(projectSubmission),
  mentorApplications: many(mentorApplication),
  recruiterApplications: many(recruiterApplication),
  studentDoubts: many(doubtSession, { relationName: "studentDoubts" }),
  mentorDoubts: many(doubtSession, { relationName: "mentorDoubts" }),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

// ===============MENTOR APPLICATION=================

export const mentorApplication = pgTable(
  "mentor_application",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    fullName: text("full_name").notNull(),
    email: text("email").notNull(),
    contactNo: text("contact_no").notNull(),
    gender: text("gender").notNull(),
    dob: timestamp("dob").notNull(),
    address: text("address").notNull(),
    linkedinUrl: text("linkedin_url"),
    resumeUrl: text("resume_url").notNull(),
    portfolioUrl: text("portfolio_url"),
    experience: text("experience"), // Storing JSON string of experience array
    status: text("status", { enum: ["pending", "approved", "rejected"] })
      .default("pending")
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("mentor_application_userId_idx").on(table.userId)]
);

export const mentorApplicationRelations = relations(
  mentorApplication,
  ({ one }) => ({
    user: one(user, {
      fields: [mentorApplication.userId],
      references: [user.id],
    }),
  })
);

// ===============RECRUITER APPLICATION=================

export const recruiterApplication = pgTable(
  "recruiter_application",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    fullName: text("full_name").notNull(),
    email: text("email").notNull(),
    companyName: text("company_name").notNull(),
    position: text("position").notNull(),
    contactNo: text("contact_no").notNull(),
    linkedinUrl: text("linkedin_url"),
    websiteUrl: text("website_url"),
    status: text("status", { enum: ["pending", "approved", "rejected"] })
      .default("pending")
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("recruiter_application_userId_idx").on(table.userId)]
);

export const recruiterApplicationRelations = relations(
  recruiterApplication,
  ({ one }) => ({
    user: one(user, {
      fields: [recruiterApplication.userId],
      references: [user.id],
    }),
  })
);

// ===============PARTNER AGENCY APPLICATION=================

export const partnerApplication = pgTable(
  "partner_application",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    agencyName: text("agency_name").notNull(),
    email: text("email").notNull(),
    contactNo: text("contact_no").notNull(),
    websiteUrl: text("website_url"),
    description: text("description"), // Brief about agency
    status: text("status", { enum: ["pending", "approved", "rejected"] })
      .default("pending")
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("partner_application_userId_idx").on(table.userId)]
);

export const partnerApplicationRelations = relations(
  partnerApplication,
  ({ one }) => ({
    user: one(user, {
      fields: [partnerApplication.userId],
      references: [user.id],
    }),
  })
);

// ===============COURSES=================
// ... (course, courseMonth, courseWeek tables remain same)

export const course = pgTable("course", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  image: text("image"),
  price: integer("price").default(0),
  sellingPoints: json("selling_points"),
  level: text("level", {
    enum: ["Beginner", "Intermediate", "Advanced", "All Levels"],
  })
    .default("All Levels")
    .notNull(),
  portfolioStats: json("portfolio_stats").$type<{
    scripts?: number;
    audits?: number;
    caseStudies?: number;
    certificates?: number;
  }>(),
  upcomingCohort: text("upcoming_cohort"),
  status: text("status", { enum: ["published", "unpublished"] })
    .default("unpublished")
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const courseMonth = pgTable(
  "course_month",
  {
    id: text("id").primaryKey(),
    courseId: text("course_id")
      .notNull()
      .references(() => course.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    type: text("type", { enum: ["common", "team"] })
      .default("common")
      .notNull(),
    order: integer("order").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("course_month_courseId_idx").on(table.courseId)]
);

export const courseWeek = pgTable(
  "course_week",
  {
    id: text("id").primaryKey(),
    monthId: text("month_id")
      .notNull()
      .references(() => courseMonth.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    order: integer("order").notNull(),
    team: text("team", { enum: ["red", "blue"] }), // Nullable, only relevant if month type is 'team'
    isProject: boolean("is_project").default(false).notNull(),
    projectTitle: text("project_title"),
    projectDescription: text("project_description"),
    content: text("content"), // High-level week content / plan
    lessonDescription: text("lesson_description"), // Detailed lesson description for video lessons
    writtenExamples: text("written_examples"), // Commands/code snippets for video lessons
    resources: json("resources"), // Array of { title, link }
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("course_week_monthId_idx").on(table.monthId)]
);

export const weekMentor = pgTable(
  "week_mentor",
  {
    id: text("id").primaryKey(),
    weekId: text("week_id")
      .notNull()
      .references(() => courseWeek.id, { onDelete: "cascade" }),
    mentorId: text("mentor_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    assignedAt: timestamp("assigned_at").defaultNow().notNull(),
  },
  (table) => [
    index("week_mentor_weekId_idx").on(table.weekId),
    index("week_mentor_mentorId_idx").on(table.mentorId),
  ]
);

export const assessment = pgTable(
  "assessment",
  {
    id: text("id").primaryKey(),
    weekId: text("week_id")
      .notNull()
      .references(() => courseWeek.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    topic: text("topic").notNull(),
    problem: text("problem").notNull(),
    submissionFormat: text("submission_format").default("pdf").notNull(),
    deadline: timestamp("deadline"), // Assessment deadline
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("assessment_weekId_idx").on(table.weekId)]
);

export const projectSubmission = pgTable(
  "project_submission",
  {
    id: text("id").primaryKey(),
    weekId: text("week_id")
      .notNull()
      .references(() => courseWeek.id, { onDelete: "cascade" }),
    studentId: text("student_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    githubUrl: text("github_url"),
    liveUrl: text("live_url"),
    demoUrl: text("demo_url"),
    description: text("description"),
    score: integer("score"), // 1-10
    review: text("review"),
    status: text("status", { enum: ["pending", "graded"] })
      .default("pending")
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("project_submission_weekId_idx").on(table.weekId),
    index("project_submission_studentId_idx").on(table.studentId),
  ]
);

export const assessmentResponse = pgTable(
  "assessment_response",
  {
    id: text("id").primaryKey(),
    assessmentId: text("assessment_id")
      .notNull()
      .references(() => assessment.id, { onDelete: "cascade" }),
    studentId: text("student_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    submissionUrl: text("submission_url"),
    score: integer("score"),
    feedback: text("feedback"),
    status: text("status", { enum: ["pending", "completed"] })
      .default("pending")
      .notNull(),
    submittedAt: timestamp("submitted_at").defaultNow().notNull(),
  },
  (table) => [
    index("assessment_response_assessmentId_idx").on(table.assessmentId),
    index("assessment_response_studentId_idx").on(table.studentId),
  ]
);

export const enrollment = pgTable(
  "enrollment",
  {
    id: text("id").primaryKey(),
    studentId: text("student_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    courseId: text("course_id") // Optional relation if we want to link directly to course, assuming course exists
      .notNull()
      .references(() => course.id, { onDelete: "cascade" }),
    enrolledAt: timestamp("enrolled_at").defaultNow().notNull(),
    paymentStatus: text("payment_status", {
      enum: ["paid", "pending", "cancelled"],
    })
      .default("pending")
      .notNull(),
    amount: integer("amount"), // Amount in cents
    currency: text("currency").default("INR"),
  },
  (table) => [
    index("enrollment_studentId_idx").on(table.studentId),
    index("enrollment_courseId_idx").on(table.courseId),
  ]
);

export const studentProgress = pgTable(
  "student_progress",
  {
    id: text("id").primaryKey(),
    studentId: text("student_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    weekId: text("week_id")
      .notNull()
      .references(() => courseWeek.id, { onDelete: "cascade" }),
    isCompleted: boolean("is_completed").default(false).notNull(),
    isUnlocked: boolean("is_unlocked").default(false).notNull(),
    completedAt: timestamp("completed_at"),
  },
  (table) => [
    index("student_progress_studentId_idx").on(table.studentId),
    index("student_progress_weekId_idx").on(table.weekId),
  ]
);

export const courseRelations = relations(course, ({ many }) => ({
  months: many(courseMonth),
  enrollments: many(enrollment),
  coupons: many(coupon),
}));

export const courseMonthRelations = relations(courseMonth, ({ one, many }) => ({
  course: one(course, {
    fields: [courseMonth.courseId],
    references: [course.id],
  }),
  weeks: many(courseWeek),
}));

export const courseWeekRelations = relations(courseWeek, ({ one, many }) => ({
  month: one(courseMonth, {
    fields: [courseWeek.monthId],
    references: [courseMonth.id],
  }),
  mentors: many(weekMentor),
  assessments: many(assessment),
  projectSubmissions: many(projectSubmission),
}));

export const weekMentorRelations = relations(weekMentor, ({ one }) => ({
  week: one(courseWeek, {
    fields: [weekMentor.weekId],
    references: [courseWeek.id],
  }),
  mentor: one(user, {
    fields: [weekMentor.mentorId],
    references: [user.id],
  }),
}));

export const assessmentRelations = relations(assessment, ({ one, many }) => ({
  week: one(courseWeek, {
    fields: [assessment.weekId],
    references: [courseWeek.id],
  }),
  responses: many(assessmentResponse),
}));

export const assessmentResponseRelations = relations(
  assessmentResponse,
  ({ one }) => ({
    assessment: one(assessment, {
      fields: [assessmentResponse.assessmentId],
      references: [assessment.id],
    }),
    student: one(user, {
      fields: [assessmentResponse.studentId],
      references: [user.id],
    }),
  })
);

export const projectSubmissionRelations = relations(
  projectSubmission,
  ({ one }) => ({
    week: one(courseWeek, {
      fields: [projectSubmission.weekId],
      references: [courseWeek.id],
    }),
    student: one(user, {
      fields: [projectSubmission.studentId],
      references: [user.id],
    }),
  })
);

export const enrollmentRelations = relations(enrollment, ({ one }) => ({
  student: one(user, {
    fields: [enrollment.studentId],
    references: [user.id],
  }),
  course: one(course, {
    fields: [enrollment.courseId],
    references: [course.id],
  }),
}));

export const internshipEnrollment = pgTable(
  "internship_enrollment",
  {
    id: text("id").primaryKey(),
    studentId: text("student_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    track: text("track").notNull(),
    tier: text("tier").notNull(),
    paymentStatus: text("payment_status", {
      enum: ["paid", "pending", "cancelled"],
    })
      .default("pending")
      .notNull(),
    amount: integer("amount"),
    currency: text("currency").default("INR"),
    enrolledAt: timestamp("enrolled_at").defaultNow().notNull(),
  },
  (table) => [
    index("internship_enrollment_studentId_idx").on(table.studentId),
  ]
);

export const internshipEnrollmentRelations = relations(internshipEnrollment, ({ one }) => ({
  student: one(user, {
    fields: [internshipEnrollment.studentId],
    references: [user.id],
  }),
}));

export const studentProgressRelations = relations(
  studentProgress,
  ({ one }) => ({
    student: one(user, {
      fields: [studentProgress.studentId],
      references: [user.id],
    }),
    week: one(courseWeek, {
      fields: [studentProgress.weekId],
      references: [courseWeek.id],
    }),
  })
);

export const doubtSession = pgTable(
  "doubt_session",
  {
    id: text("id").primaryKey(),
    courseId: text("course_id")
      .notNull()
      .references(() => course.id, { onDelete: "cascade" }),
    studentId: text("student_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    mentorId: text("mentor_id").references(() => user.id, {
      onDelete: "set null",
    }), // Optional initially, or assigned later
    topic: text("topic").notNull(),
    description: text("description").notNull(),
    status: text("status", {
      enum: ["pending", "scheduled", "completed", "rejected"],
    })
      .default("pending")
      .notNull(),
    scheduledAt: timestamp("scheduled_at"),
    meetLink: text("meet_link"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("doubt_session_studentId_idx").on(table.studentId),
    index("doubt_session_mentorId_idx").on(table.mentorId),
    index("doubt_session_courseId_idx").on(table.courseId),
  ]
);

export const doubtSessionRelations = relations(doubtSession, ({ one }) => ({
  student: one(user, {
    fields: [doubtSession.studentId],
    references: [user.id],
    relationName: "studentDoubts",
  }),
  mentor: one(user, {
    fields: [doubtSession.mentorId],
    references: [user.id],
    relationName: "mentorDoubts",
  }),
  course: one(course, {
    fields: [doubtSession.courseId],
    references: [course.id],
  }),
}));

export const coupon = pgTable(
  "coupon",
  {
    id: text("id").primaryKey(),
    code: text("code").notNull().unique(),
    discountPercent: integer("discount_percent").notNull(),
    maxDiscountAmount: integer("max_discount_amount"), // Max absolute amount to discount
    maxUses: integer("max_uses"), // Null for unlimited
    usedCount: integer("used_count").default(0).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    expiresAt: timestamp("expires_at"),
    partnerId: text("partner_id").references(() => user.id, {
      onDelete: "set null",
    }),
    partnerRevenue: integer("partner_revenue"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("coupon_code_idx").on(table.code),
    index("coupon_partnerId_idx").on(table.partnerId),
  ]
);

export const couponRelations = relations(coupon, ({ one }) => ({
  partner: one(user, {
    fields: [coupon.partnerId],
    references: [user.id],
  }),
}));

// ===============WAITLIST ENTRY=================

export const waitlistEntry = pgTable(
  "waitlist_entry",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    course: text("course").notNull(), // slug: "foundation", "soc", "vapt", etc.
    courseLabel: text("course_label").notNull(), // human-readable label
    status: text("status", { enum: ["pending", "contacted", "enrolled", "rejected"] })
      .default("pending")
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("waitlist_entry_userId_idx").on(table.userId),
    index("waitlist_entry_course_idx").on(table.course),
  ]
);

export const waitlistEntryRelations = relations(waitlistEntry, ({ one }) => ({
  user: one(user, {
    fields: [waitlistEntry.userId],
    references: [user.id],
  }),
}));
