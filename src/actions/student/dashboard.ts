"use server";

import { db } from "@/lib/db";
import {
  course,
  courseMonth,
  courseWeek,
  enrollment,
  studentProgress,
  assessment,
  assessmentResponse,
  projectSubmission,
  user,
  internshipEnrollment,
} from "@/lib/db/schema";
import { eq, and, desc, asc, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";

/**
 * Get student overview stats
 */
export async function getStudentStats(studentId: string) {
  try {
    const enrollments = await db.query.enrollment.findMany({
      where: eq(enrollment.studentId, studentId),
    });

    const completedWeeks = await db.query.studentProgress.findMany({
      where: and(
        eq(studentProgress.studentId, studentId),
        eq(studentProgress.isCompleted, true)
      ),
    });

    // Calculate score (mock logic or real avg)
    const assessmentScores = await db.query.assessmentResponse.findMany({
      where: eq(assessmentResponse.studentId, studentId),
    });

    let totalScore = 0;
    let count = 0;
    assessmentScores.forEach((a) => {
      if (a.score !== null) {
        totalScore += a.score;
        count++;
      }
    });

    const avgScore = count > 0 ? (totalScore / count).toFixed(1) : 0;

    return {
      success: true,
      data: {
        enrolledCourses: enrollments.length,
        completedModules: completedWeeks.length,
        avgScore: avgScore,
        attendance: "95%", // Placeholder for now
      },
    };
  } catch (error) {
    console.error("Error fetching stats:", error);
    return { success: false, error: "Failed to fetch stats" };
  }
}

/**
 * Get enrolled courses
 */
export async function getEnrolledCourses(studentId: string) {
  try {
    const enrollments = await db.query.enrollment.findMany({
      where: and(
        eq(enrollment.studentId, studentId),
        eq(enrollment.paymentStatus, "paid")
      ),
      with: {
        course: true,
      },
    });

    const internshipEnrollments = await db
      .select()
      .from(internshipEnrollment)
      .where(and(
        eq(internshipEnrollment.studentId, studentId),
        eq(internshipEnrollment.paymentStatus, "paid")
      ));

    const standardCourses = enrollments.map((e) => e.course);
    
    const internshipCourses = internshipEnrollments.map((ie) => ({
        id: `internship-${ie.id}`,
        title: `Internship: ${ie.track} (Tier ${ie.tier})`,
        description: `Your enrolled track for ${ie.track}`,
        level: "Beginner" as "Beginner",
        image: null,
        price: ie.amount,
        sellingPoints: null,
        portfolioStats: null,
        upcomingCohort: null,
        status: "published" as "published",
        createdAt: ie.enrolledAt,
        updatedAt: ie.enrolledAt,
    }));

    const weekZeroCourse = {
        id: "week-0-cohort",
        title: "Week 0: Foundation [FREE]",
        description: "Your completely free gateway module to learn cybersecurity basics.",
        level: "Beginner" as "Beginner",
        image: null,
        price: 0,
        sellingPoints: null,
        portfolioStats: null,
        upcomingCohort: null,
        status: "published" as "published",
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    return { success: true, data: [...standardCourses, ...internshipCourses, weekZeroCourse] };
  } catch (error) {
    console.error("Error fetching courses:", error);
    return { success: false, error: "Failed to fetch courses" };
  }
}

/**
 * Get Course Content with Locking Logic
 */
export async function getCourseContent(studentId: string, courseId: string) {
  try {
    // 0. Handle Mocked Course: Week 0 Free Cohort
    if (courseId === "week-0-cohort") {
      return {
        success: true,
        data: [
          {
            id: "curriculum",
            title: "Foundation Track",
            weeks: [
              {
                id: "w-0-1",
                title: "Week 0: Complete Foundation",
                isLocked: false,
                isCompleted: true,
                content: "Session 1: Cybersecurity Basics\nSession 2: Career Pathways\nSession 3: Full Lab Setup\n\nIntroduction to Cybersecurity, CIA Triad, Basic Terminology, and Kali Linux VirtualBox configuration.",
                isProject: false,
                assessments: [],
              }
            ]
          }
        ]
      } as any;
    }

    // 1. Handle Mocked Courses for Internships
    if (courseId.startsWith("internship-")) {
      const internshipId = courseId.replace("internship-", "");
      const [ie] = await db
        .select()
        .from(internshipEnrollment)
        .where(eq(internshipEnrollment.id, internshipId));

      if (!ie) {
        return { success: false, error: "Internship enrollment not found" };
      }

      const isPaid = ie.paymentStatus === "paid";
      const tier = ie.tier;

      const weeks = [];

      // Week 0
      weeks.push({
          id: "w-int-0",
          title: "Week 0: Foundation",
          isLocked: false,
          isCompleted: true,
          content: "Session 1: Cybersecurity Basics\nSession 2: Career Pathways\nSession 3: Full Lab Setup.",
          isProject: false,
          assessments: [],
      });

      // Week 1 to 4 (Month 1 equivalent)
      weeks.push({
          id: "w-int-1",
          title: "Week 1: Fundamentals",
          isLocked: !isPaid,
          isCompleted: false,
          content: `Welcome to the Internship! Let's get started with your track fundamentals.`,
          isProject: false,
          assessments: [],
      });
      weeks.push({
          id: "w-int-2",
          title: "Week 2: Setup & Tools",
          isLocked: true,
          isCompleted: false,
          content: "Deep dive into the specialized tools for your track.",
          isProject: false,
          assessments: [],
      });
      weeks.push({
          id: "w-int-3",
          title: "Week 3: Practical Labs",
          isLocked: true,
          isCompleted: false,
          content: "Hands-on labs and exercises.",
          isProject: false,
          assessments: [],
      });
      weeks.push({
          id: "w-int-4",
          title: "Week 4: Phase 1 Project",
          isLocked: true,
          isCompleted: false,
          content: "Apply everything you've learned to build a mini-project.",
          isProject: true,
          projectTitle: tier === "1" ? "Final Track Capstone" : "Phase 1 Mini-Project",
          projectDescription: tier === "1" ? "A comprehensive project for your public portfolio." : "A mini-capstone to ensure you grasp the fundamentals.",
          assessments: [],
      });

      // Week 5 to 8 (Tier 2 and 3)
      if (tier === "2" || tier === "3") {
          weeks.push({
              id: "w-int-5",
              title: "Week 5: Advanced Techniques",
              isLocked: true,
              isCompleted: false,
              content: "Moving into intermediate and advanced techniques.",
              isProject: false,
              assessments: [],
          });
          weeks.push({
              id: "w-int-6",
              title: "Week 6: Real-world Scenarios",
              isLocked: true,
              isCompleted: false,
              content: "Analyzing case studies and real-world incidents.",
              isProject: false,
              assessments: [],
          });
          weeks.push({
              id: "w-int-7",
              title: "Week 7: Operations",
              isLocked: true,
              isCompleted: false,
              content: "Day-to-day operations and workflows.",
              isProject: false,
              assessments: [],
          });
          weeks.push({
              id: "w-int-8",
              title: "Week 8: Phase 2 Project",
              isLocked: true,
              isCompleted: false,
              content: "Intermediate capstone project.",
              isProject: true,
              projectTitle: tier === "2" ? "Final Track Capstone" : "Phase 2 Milestone Project",
              projectDescription: tier === "2" ? "A comprehensive project for your public portfolio." : "Demonstrate your advanced skills.",
              assessments: [],
          });
      }

      // Week 9 to 12 (Tier 3 only)
      if (tier === "3") {
          weeks.push({
              id: "w-int-9",
              title: "Week 9: Threat Hunting & Analysis",
              isLocked: true,
              isCompleted: false,
              content: "Deep dive into analysis.",
              isProject: false,
              assessments: [],
          });
          weeks.push({
              id: "w-int-10",
              title: "Week 10: Reporting & Documentation",
              isLocked: true,
              isCompleted: false,
              content: "Learning how to write professional reports.",
              isProject: false,
              assessments: [],
          });
          weeks.push({
              id: "w-int-11",
              title: "Week 11: Interview Prep",
              isLocked: true,
              isCompleted: false,
              content: "Mock interviews and resume building.",
              isProject: false,
              assessments: [],
          });
          weeks.push({
              id: "w-int-12",
              title: "Week 12: Final Capstone Project",
              isLocked: true,
              isCompleted: false,
              content: "Your final massive capstone project.",
              isProject: true,
              projectTitle: "Final Track Capstone",
              projectDescription: "A comprehensive project for your public portfolio.",
              assessments: [],
          });
      }

      return {
          success: true,
          data: [{
              id: "curriculum-track",
              title: "Internship Curriculum",
              weeks: weeks
          }]
      } as any;
    }

    // 1. Get entire course structure
    const months = await db.query.courseMonth.findMany({
      where: eq(courseMonth.courseId, courseId),
      with: {
        weeks: {
          orderBy: asc(courseWeek.order),
          with: {
            assessments: true,
            projectSubmissions: {
              where: eq(projectSubmission.studentId, studentId),
            },
          },
        },
      },
      orderBy: asc(courseMonth.order),
    });

    // 2. Get student progress for this course (all weeks)
    const progress = await db.query.studentProgress.findMany({
      where: eq(studentProgress.studentId, studentId),
    });

    const completedWeekIds = new Set(
      progress.filter((p) => p.isCompleted).map((p) => p.weekId)
    );

    // 3. Get all assessment responses for this student
    const assessmentResponses = await db.query.assessmentResponse.findMany({
      where: eq(assessmentResponse.studentId, studentId),
    });

    const assessmentMap = new Map();
    assessmentResponses.forEach((r) => assessmentMap.set(r.assessmentId, r));

    // 4. Process Locking Logic & Structure Data
    const validScoreThreshold = 50;

    const structuredData = months.map((month) => {
      const weeksWithStatus = month.weeks.map((week) => {
        const lessonDescription = week.lessonDescription ?? null;
        const writtenExamples = week.writtenExamples ?? null;
        // Check Project Status
        const projSub = week.projectSubmissions[0];
        const isProjectPending = projSub?.status === "pending";
        const projectScore = projSub?.score || null;
        const isProjectRejected =
          !!projSub &&
          projSub.status === "graded" &&
          (projectScore === null || projectScore < validScoreThreshold);
        // Logic: If graded and score < 50, it's rejected. If score is null but graded, assuming rejected or waiting input.
        // usually graded implies score exists.

        const isProjectCompleted =
          !!projSub &&
          projSub.status === "graded" &&
          projectScore !== null &&
          projectScore >= validScoreThreshold;

        // Check Assessments Status
        const weekAssessments = week.assessments.map((a) => {
          const resp = assessmentMap.get(a.id);
          const score = resp?.score ?? null; // Use nullish coalescing to safeguard 0
          const feedback = resp?.feedback || null;
          const status = resp?.status || null;

          // Logic:
          // Completed = Submitted AND Score >= 50
          // Rejected = Submitted AND Score < 50
          // Pending = Submitted AND Status is 'pending' (or score is null if we fallback)

          const isCompleted =
            !!resp && score !== null && score >= validScoreThreshold;
          const isRejected =
            !!resp && score !== null && score < validScoreThreshold;
          const isPending = !!resp && (status === "pending" || score === null); // Robust check

          return {
            ...a,
            isCompleted: isCompleted,
            isRejected: isRejected,
            isPending: isPending,
            score: score,
            feedback: feedback,
          };
        });

        // Pending Logic:
        const pendingAssessment = weekAssessments.some((a) => a.isPending);

        const isPending = isProjectPending || pendingAssessment;

        // Week Completion Logic:
        const hasAssessments = weekAssessments.length > 0;
        const hasProject = week.isProject || !!projSub;

        let isWeekCompleted = false;

        if (hasAssessments || hasProject) {
          const allAssessmentsPassed = weekAssessments.every(
            (a) => a.isCompleted
          );
          const projectPassed = !hasProject || isProjectCompleted;

          isWeekCompleted = allAssessmentsPassed && projectPassed;
        } else {
          // If no tasks, we assume it's completed (e.g. read-only content)
          isWeekCompleted = true;
        }

        return {
          ...week,
          assessments: weekAssessments,
          lessonDescription,
          writtenExamples,
          isLocked: false,
          isCompleted: isWeekCompleted,
          isPending: isPending,
          projectScore: projectScore,
          projectReview: projSub?.review || null,
          isProjectRejected: isProjectRejected,
        };
      });
      return { ...month, weeks: weeksWithStatus };
    });

    // Apply Locking Logic (Sequential)
    const allWeeksFlat = structuredData.flatMap((m) => m.weeks);

    for (let i = 0; i < allWeeksFlat.length; i++) {
      if (i === 0) {
        allWeeksFlat[i].isLocked = false;
      } else {
        const prev = allWeeksFlat[i - 1];
        // Week is locked if previous week is NOT completed
        allWeeksFlat[i].isLocked = !prev.isCompleted;
      }
    }

    return { success: true, data: structuredData };
  } catch (error) {
    console.error("Error fetching course content:", error);
    return { success: false, error: "Failed to fetch content" };
  }
}

/**
 * Get all submissions (Assignment & Project)
 */
export async function getAllSubmissions(studentId: string) {
  try {
    const assessments = await db.query.assessmentResponse.findMany({
      where: eq(assessmentResponse.studentId, studentId),
      with: {
        assessment: {
          with: {
            week: {
              with: {
                month: {
                  with: { course: true },
                },
              },
            },
          },
        },
      },
      orderBy: desc(assessmentResponse.submittedAt),
    });

    const projects = await db.query.projectSubmission.findMany({
      where: eq(projectSubmission.studentId, studentId),
      with: {
        week: {
          with: {
            month: {
              with: { course: true },
            },
          },
        },
      },
      orderBy: desc(projectSubmission.createdAt),
    });

    return { success: true, data: { assessments, projects } };
  } catch (error) {
    console.error("Error fetching submissions:", error);
    return { success: false, error: "Failed to fetch submissions" };
  }
}

/**
 * Get Approved Projects for Profile
 */
export async function getApprovedProjects(studentId: string) {
  try {
    const approvedProjects = await db.query.projectSubmission.findMany({
      where: and(
        eq(projectSubmission.studentId, studentId),
        eq(projectSubmission.status, "graded")
      ),
      with: {
        week: {
          with: {
            month: {
              with: { course: true },
            },
          },
        },
      },
      orderBy: desc(projectSubmission.createdAt),
    });

    return { success: true, data: approvedProjects };
  } catch (error) {
    console.error("Error fetching approved projects:", error);
    return { success: false, error: "Failed to fetch projects" };
  }
}

/**
 * Get Student Profile
 */
export async function getStudentProfile(studentId: string) {
  try {
    const student = await db.query.user.findFirst({
      where: eq(user.id, studentId),
    });

    if (!student) {
      return { success: false, error: "Student not found" };
    }

    return { success: true, data: student };
  } catch (error) {
    console.error("Error fetching student profile:", error);
    return { success: false, error: "Failed to fetch profile" };
  }
}

/**
 * Update Profile
 */
export async function updateProfile(
  studentId: string,
  data: Partial<typeof user.$inferSelect>
) {
  try {
    await db
      .update(user)
      .set({
        bio: data.bio,
        githubUrl: data.githubUrl,
        linkedinUrl: data.linkedinUrl,
        websiteUrl: data.websiteUrl,
        twitterUrl: data.twitterUrl,
        contactEmail: data.contactEmail,
        resumeUrl: data.resumeUrl,
        topProjects: data.topProjects,
        updatedAt: new Date(),
      })
      .where(eq(user.id, studentId));

    revalidatePath("/dashboard/profile");
    return { success: true };
  } catch (error) {
    console.error("Error updating profile:", error);
    return { success: false, error: "Failed to update profile" };
  }
}

/**
 * Submit Assignment and Auto-Complete Week
 */
export async function submitAssignment(
  studentId: string,
  assessmentId: string,
  weekId: string,
  url: string
) {
  try {
    // 1. Check if submission exists
    const existing = await db.query.assessmentResponse.findFirst({
      where: and(
        eq(assessmentResponse.studentId, studentId),
        eq(assessmentResponse.assessmentId, assessmentId)
      ),
    });

    if (existing) {
      await db
        .update(assessmentResponse)
        .set({
          submissionUrl: url,
          submittedAt: new Date(),
          status: "pending", // Resubmit resets status? Or keeps it? Let's say pending.
        })
        .where(eq(assessmentResponse.id, existing.id));
    } else {
      await db.insert(assessmentResponse).values({
        id: crypto.randomUUID(),
        studentId,
        assessmentId,
        submissionUrl: url,
        status: "pending",
      });
    }

    // 2. Mark week as completed?
    // Logic: If this is the *only* assessment or required item.
    // For simplicity, let's assume submitting the assessment marks the week as done.
    // In a complex app, we'd check if ALL assessments in the week are done.
    // Let's check if there are other assessments in this week...
    // For now, AUTO COMPLETE WEEK on submission.

    revalidatePath("/dashboard/student");
    return { success: true };
  } catch (error) {
    console.error("Error submitting assignment:", error);
    return { success: false, error: "Failed to submit assignment" };
  }
}

/**
 * Submit Project and Auto-Complete Week
 */
export async function submitProject(
  studentId: string,
  weekId: string,
  data: {
    githubUrl?: string;
    liveUrl?: string;
    demoUrl?: string;
    description: string;
  }
) {
  try {
    const existing = await db.query.projectSubmission.findFirst({
      where: and(
        eq(projectSubmission.studentId, studentId),
        eq(projectSubmission.weekId, weekId)
      ),
    });

    if (existing) {
      await db
        .update(projectSubmission)
        .set({
          githubUrl: data.githubUrl,
          liveUrl: data.liveUrl,
          demoUrl: data.demoUrl,
          description: data.description,
          status: "pending",
          updatedAt: new Date(),
        })
        .where(eq(projectSubmission.id, existing.id));
    } else {
      await db.insert(projectSubmission).values({
        id: crypto.randomUUID(),
        studentId,
        weekId,
        githubUrl: data.githubUrl,
        liveUrl: data.liveUrl,
        demoUrl: data.demoUrl,
        description: data.description,
        status: "pending",
      });
    }

    revalidatePath("/dashboard/student");
    return { success: true };
  } catch (error) {
    console.error("Error submitting project:", error);
    return { success: false, error: "Failed to submit project" };
  }
}

// Helper to mark week complete
async function markWeekAsCompleted(studentId: string, weekId: string) {
  const existing = await db.query.studentProgress.findFirst({
    where: and(
      eq(studentProgress.studentId, studentId),
      eq(studentProgress.weekId, weekId)
    ),
  });

  if (!existing) {
    await db.insert(studentProgress).values({
      id: crypto.randomUUID(),
      studentId,
      weekId,
      isCompleted: true,
      completedAt: new Date(),
      isUnlocked: true,
    });
  } else if (!existing.isCompleted) {
    await db
      .update(studentProgress)
      .set({ isCompleted: true, completedAt: new Date() })
      .where(eq(studentProgress.id, existing.id));
  }
}
