"use client";

import { useState, useEffect } from "react";
import {
  Control,
  UseFormRegister,
  FieldErrors,
  UseFormWatch,
  UseFormSetValue,
  useFieldArray,
  useWatch,
} from "react-hook-form";
import { CourseFormValues } from "@/lib/validators/course";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Trash2,
  GripVertical,
  FileText,
  CheckSquare,
  Plus,
  Link as LinkIcon,
  Search,
  UserPlus,
  X,
  CalendarIcon,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface WeekCardProps {
  monthIndex: number;
  weekIndex: number;
  control: Control<CourseFormValues>;
  register: UseFormRegister<CourseFormValues>;
  errors: FieldErrors<CourseFormValues>;
  remove: () => void;
  watch: UseFormWatch<CourseFormValues>;
  setValue: UseFormSetValue<CourseFormValues>;
  mentors?: { id: string; name: string; role: string }[];
}

export function WeekCard({
  monthIndex,
  weekIndex,
  control,
  register,
  errors,
  remove,
  watch,
  setValue,
  mentors = [],
}: WeekCardProps) {
  // Determine if this is a 4th week (Project Week)
  // Index 0,1,2 -> Normal. Index 3 -> Project.
  // Index 4,5,6 -> Normal. Index 7 -> Project.
  const isFourthWeek = (weekIndex + 1) % 4 === 0;

  /* Force Project Week for 4th week */
  // We rely on isFourthWeek to visually enforce. Form state sync via useEffect.
  const isProject =
    isFourthWeek ||
    !!watch(`months.${monthIndex}.weeks.${weekIndex}.isProject`);

  // Use useWatch for better reactivity on deep nested objects
  const assessmentValue = useWatch({
    control,
    name: `months.${monthIndex}.weeks.${weekIndex}.assessment`,
  });
  const hasAssessment = !!assessmentValue;

  const monthType = watch(`months.${monthIndex}.type`);
  const assignedMentors =
    useWatch({
      control,
      name: `months.${monthIndex}.weeks.${weekIndex}.mentorIds`,
    }) || [];

  const [mentorSearch, setMentorSearch] = useState("");
  const [isMentorDialogOpen, setIsMentorDialogOpen] = useState(false);

  useEffect(() => {
    if (isFourthWeek) {
      // Force project to true for 4th week
      const currentValue = watch(
        `months.${monthIndex}.weeks.${weekIndex}.isProject`
      );
      if (!currentValue) {
        setValue(`months.${monthIndex}.weeks.${weekIndex}.isProject`, true, {
          shouldValidate: true,
        });
      }
    } else {
      // Ensure non-4th weeks are NOT projects
      const currentValue = watch(
        `months.${monthIndex}.weeks.${weekIndex}.isProject`
      );
      if (currentValue) {
        setValue(`months.${monthIndex}.weeks.${weekIndex}.isProject`, false, {
          shouldValidate: true,
        });
      }
    }
  }, [weekIndex, monthIndex, setValue, watch, isFourthWeek]);

  // Resources Field Array
  const {
    fields: resourceFields,
    append: appendResource,
    remove: removeResource,
  } = useFieldArray({
    control,
    name: `months.${monthIndex}.weeks.${weekIndex}.resources`,
  });

  const toggleAssessment = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (hasAssessment) {
      console.log("Removing assessment");
      // Use null to remove the field complying with nullable() schema
      setValue(`months.${monthIndex}.weeks.${weekIndex}.assessment`, null, {
        shouldValidate: true,
        shouldDirty: true,
      });
    } else {
      console.log("Adding assessment");
      // Set default values
      setValue(
        `months.${monthIndex}.weeks.${weekIndex}.assessment`,
        {
          title: "New Assessment",
          topic: "General Topic",
          problem: "",
          submissionFormat: "pdf",
          // deadline: undefined, // Optional
        },
        {
          shouldValidate: true,
          shouldDirty: true,
          shouldTouch: true,
        }
      );
    }
  };

  const handleMentorToggle = (mentorId: string, checked: boolean) => {
    const current = assignedMentors || [];
    let newMentors: string[];

    if (checked) {
      if (!current.includes(mentorId)) {
        newMentors = [...current, mentorId];
        // Auto close on selection
        setIsMentorDialogOpen(false);
        setMentorSearch(""); // Reset search
      } else {
        newMentors = current;
      }
    } else {
      newMentors = current.filter((id) => id !== mentorId);
    }

    setValue(`months.${monthIndex}.weeks.${weekIndex}.mentorIds`, newMentors, {
      shouldValidate: true,
      shouldDirty: true,
      shouldTouch: true,
    });
  };

  const filteredMentors = mentors.filter((m) =>
    m.name.toLowerCase().includes(mentorSearch.toLowerCase())
  );

  return (
    <Card className="bg-black/30 border-white/5">
      <CardHeader className="p-2 sm:p-4 flex flex-row items-center gap-2 sm:gap-4 space-y-0">
        <div className="cursor-move text-gray-500 hover:text-white transition-colors">
          <GripVertical className="h-5 w-5" />
        </div>

        <div className="flex-1 flex flex-col gap-4">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
            <div className="flex-1 flex flex-col gap-1 w-full">
              <Input
                {...register(`months.${monthIndex}.weeks.${weekIndex}.title`)}
                placeholder="Week Title"
                className="bg-black/40 border-white/10 text-white font-mono h-10 text-base w-full focus:ring-white/20"
              />
              {errors.months?.[monthIndex]?.weeks?.[weekIndex]?.title && (
                <span className="text-red-500 text-xs">
                  {errors.months[monthIndex].weeks[weekIndex]?.title?.message}
                </span>
              )}
            </div>

            {/* Team Display - Read Only / Auto-set */}
            {monthType === "team" && (
              <div className="px-3 py-2 bg-black/40 border border-white/10 rounded-md">
                <span
                  className={`text-sm font-mono ${weekIndex < 4 ? "text-red-400" : "text-blue-400"
                    }`}
                >
                  {weekIndex < 4 ? "Red Team" : "Blue Team"}
                </span>
              </div>
            )}

            {/* Project Indicator - Badge only, no checkbox for 1-3, Badge for 4 */}
            {isFourthWeek && (
              <Badge
                variant="outline"
                className="text-indigo-400 border-indigo-500/30 bg-indigo-500/10 font-mono"
              >
                Project Week
              </Badge>
            )}
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          type="button"
          onClick={remove}
          className="text-red-500/70 hover:text-red-400 hover:bg-red-500/10 h-9 w-9 p-0"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="p-2 sm:p-4 pt-0 space-y-4">
        {/* Project Details - ONLY Show if isProject */}
        {isProject && (
          <div className="p-4 border border-indigo-500/20 rounded-md bg-indigo-500/5 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="h-4 w-4 text-indigo-400" />
              <span className="text-sm font-bold font-mono text-indigo-400">
                Project Details
              </span>
            </div>
            <Input
              {...register(
                `months.${monthIndex}.weeks.${weekIndex}.projectTitle`
              )}
              placeholder="Project Name"
              className="bg-black/40 border-white/10 text-white font-mono h-9 text-sm focus:ring-indigo-500/30"
            />
            <Textarea
              {...register(
                `months.${monthIndex}.weeks.${weekIndex}.projectDescription`
              )}
              placeholder="Describe what they are building..."
              className="bg-black/40 border-white/10 text-white font-mono text-sm min-h-[80px] focus:ring-indigo-500/30"
            />
            <Textarea
              {...register(
                `months.${monthIndex}.weeks.${weekIndex}.lessonDescription`
              )}
              placeholder="Lesson Description (overview, key concepts)..."
              className="bg-black/40 border-white/10 text-white font-mono text-sm min-h-[80px] focus:ring-indigo-500/30"
            />
            <Textarea
              {...register(
                `months.${monthIndex}.weeks.${weekIndex}.writtenExamples`
              )}
              placeholder="Written Examples (commands, code snippets, etc.)..."
              className="bg-black/40 border-white/10 text-white font-mono text-sm min-h-[80px] focus:ring-indigo-500/30"
            />
          </div>
        )}

        <div className="grid grid-cols-1 gap-3">
          {/* Content Description - HIDE if Project Week */}
          {!isProject && (
            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-sm text-gray-400 hover:text-black hover:bg-white font-mono h-9 transition-colors"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Edit Content Description
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <Textarea
                  {...register(
                    `months.${monthIndex}.weeks.${weekIndex}.content`
                  )}
                  placeholder="Enter week content description or instructions..."
                  className="bg-black/40 border-white/10 text-gray-300 font-mono text-sm min-h-[120px]"
                />
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Resources - Show for Both? Assume yes. */}
          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-sm text-gray-400 hover:text-black hover:bg-white font-mono h-9 transition-colors"
              >
                <LinkIcon className="mr-2 h-4 w-4" />
                Learning Resources ({resourceFields.length})
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2 p-3 border border-white/5 rounded-md bg-black/20 space-y-3">
              {resourceFields.map((field, rIndex) => (
                <div key={field.id} className="flex gap-3 items-start">
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Input
                      {...register(
                        `months.${monthIndex}.weeks.${weekIndex}.resources.${rIndex}.title`
                      )}
                      placeholder="Resource Title"
                      className="bg-black/40 border-white/10 text-white font-mono h-9 text-sm"
                    />
                    <Input
                      {...register(
                        `months.${monthIndex}.weeks.${weekIndex}.resources.${rIndex}.link`
                      )}
                      placeholder="URL (https://...)"
                      className="bg-black/40 border-white/10 text-white font-mono h-9 text-sm"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeResource(rIndex)}
                    className="h-9 w-9 p-0 text-red-500 hover:bg-red-500/10 hover:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => appendResource({ title: "", link: "" })}
                className="w-full h-9 text-sm font-mono border-dashed border-white/10 text-gray-400 hover:text-black hover:bg-white transition-colors"
              >
                <Plus className="mr-2 h-4 w-4" /> Add Resource
              </Button>
            </CollapsibleContent>
          </Collapsible>

          {/* Mentor Assignment - Dialog Based */}
          {/* Mentor Assignment - Dialog Based */}
          <div>
            <div className="flex flex-col gap-2 mb-2">
              <Dialog
                open={isMentorDialogOpen}
                onOpenChange={setIsMentorDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="justify-between text-sm text-gray-400 hover:text-white hover:bg-white/5 font-mono h-auto py-2 transition-colors w-full border border-white/10"
                  >
                    <div className="flex items-center">
                      <UserPlus className="mr-2 h-4 w-4" />
                      <span>Assign Mentors ({assignedMentors.length})</span>
                    </div>
                    {assignedMentors.length > 0 && (
                      <div className="flex -space-x-2">
                        {assignedMentors.slice(0, 3).map((mId) => (
                          <div
                            key={mId}
                            className="w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[10px] text-zinc-400"
                          >
                            {mentors
                              .find((m) => m.id === mId)
                              ?.name.charAt(0)
                              .toUpperCase()}
                          </div>
                        ))}
                        {assignedMentors.length > 3 && (
                          <div className="w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[10px] text-zinc-400">
                            +{assignedMentors.length - 3}
                          </div>
                        )}
                      </div>
                    )}
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-zinc-950 border-white/10 text-white sm:max-w-md shadow-2xl shadow-red-900/10">
                  <DialogHeader>
                    <DialogTitle className="font-mono text-lg uppercase tracking-wider text-red-500">
                      Select Mentors
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                      <Input
                        placeholder="SEARCH MENTORS..."
                        value={mentorSearch}
                        onChange={(e) => setMentorSearch(e.target.value)}
                        className="pl-8 bg-zinc-900 border-white/10 text-white font-mono focus:ring-red-500/50 focus:border-red-500 uppercase placeholder:text-zinc-600 rounded-none h-10"
                      />
                    </div>
                    <div className="max-h-[300px] overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                      {filteredMentors.length === 0 ? (
                        <p className="text-gray-500 font-mono text-center py-4 uppercase text-xs">
                          No mentors found.
                        </p>
                      ) : (
                        filteredMentors.map((mentor) => (
                          <div
                            key={mentor.id}
                            className="flex items-center justify-between p-3 border border-transparent hover:border-red-500/30 hover:bg-red-500/5 transition-all cursor-pointer group rounded-none"
                            onClick={() =>
                              handleMentorToggle(
                                mentor.id,
                                !assignedMentors.includes(mentor.id)
                              )
                            }
                          >
                            <div className="flex flex-col gap-1">
                              <span className="font-mono text-sm text-gray-300 group-hover:text-white font-bold">
                                {mentor.name}
                              </span>
                              <span
                                className={cn(
                                  "text-[10px] uppercase tracking-wider px-1.5 py-0.5 w-fit font-bold",
                                  mentor.role === "admin"
                                    ? "bg-red-500/20 text-red-400"
                                    : "bg-blue-500/20 text-blue-400"
                                )}
                              >
                                {mentor.role === "admin" ? "Admin" : "Mentor"}
                              </span>
                            </div>
                            <Checkbox
                              checked={assignedMentors.includes(mentor.id)}
                              onCheckedChange={(checked) =>
                                handleMentorToggle(
                                  mentor.id,
                                  checked as boolean
                                )
                              }
                              className="border-white/20 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600 text-white rounded-none"
                            />
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Selected Mentors Display - Detailed View */}
            {assignedMentors.length > 0 && (
              <div className="flex flex-col gap-2 mt-3 p-3 bg-white/5 border border-white/5">
                <span className="text-xs font-mono text-gray-500 uppercase tracking-wider mb-1">
                  Assigned Staff
                </span>
                {assignedMentors.map((mId) => {
                  const m = mentors.find((x) => x.id === mId);
                  if (!m) return null;
                  return (
                    <div
                      key={mId}
                      className="flex items-center justify-between bg-black/40 p-2 border border-white/5 hover:border-white/20 transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "w-2 h-8",
                            m.role === "admin" ? "bg-red-600" : "bg-blue-600"
                          )}
                        />
                        <div className="flex flex-col">
                          <span className="text-sm font-mono text-white">
                            {m.name}
                          </span>
                          <span className="text-[10px] font-mono text-gray-500 uppercase">
                            {m.role}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleMentorToggle(mId, false);
                        }}
                        className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0 text-gray-500 hover:text-red-500"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Assessment - HIDE if Project Week */}
          {!isProject && (
            <div className="border-t border-white/5 pt-4 mt-2">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 gap-2">
                <div className="flex items-center gap-2">
                  <CheckSquare className="h-4 w-4 text-gray-400" />
                  <span className="text-sm font-mono text-gray-300">
                    Assessment (Assignment)
                  </span>
                </div>
                <Button
                  type="button"
                  variant={hasAssessment ? "destructive" : "secondary"}
                  size="sm"
                  onClick={toggleAssessment}
                  className="h-8 py-0 text-xs px-3 font-mono w-full sm:w-auto"
                >
                  {hasAssessment ? "Remove" : "Add Assessment"}
                </Button>
              </div>

              {hasAssessment && (
                <div className="p-4 border border-white/5 rounded-lg bg-black/20 space-y-3">
                  <Input
                    {...register(
                      `months.${monthIndex}.weeks.${weekIndex}.assessment.title`
                    )}
                    placeholder="Assignment Title"
                    className="bg-black/40 border-white/10 text-white font-mono h-9 text-sm focus:ring-white/20"
                  />
                  <Input
                    {...register(
                      `months.${monthIndex}.weeks.${weekIndex}.assessment.topic`
                    )}
                    placeholder="Assessment Topic"
                    className="bg-black/40 border-white/10 text-white font-mono h-9 text-sm focus:ring-white/20"
                  />
                  <Textarea
                    {...register(
                      `months.${monthIndex}.weeks.${weekIndex}.assessment.problem`
                    )}
                    placeholder="Problem Statement..."
                    className="bg-black/40 border-white/10 text-white font-mono text-sm min-h-[100px] focus:ring-white/20"
                  />
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 min-w-0">
                      <Label className="text-xs text-gray-400 font-mono mb-1 block">
                        Submission Format
                      </Label>
                      <Select
                        onValueChange={(val) =>
                          setValue(
                            `months.${monthIndex}.weeks.${weekIndex}.assessment.submissionFormat`,
                            val as "url" | "pdf"
                          )
                        }
                        defaultValue={
                          watch(
                            `months.${monthIndex}.weeks.${weekIndex}.assessment.submissionFormat`
                          ) || "pdf"
                        }
                      >
                        <SelectTrigger className="bg-black/40 border-white/10 text-white font-mono h-9 text-sm w-full">
                          <SelectValue placeholder="Format" />
                        </SelectTrigger>
                        <SelectContent className="bg-black border-white/10 text-white font-mono">
                          <SelectItem value="pdf">PDF Upload</SelectItem>
                          <SelectItem value="url">URL Link</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex-1 min-w-0">
                      <Label className="text-xs text-gray-400 font-mono mb-1 block">
                        Deadline
                      </Label>
                      <DeadlinePicker
                        control={control}
                        setValue={setValue}
                        monthIndex={monthIndex}
                        weekIndex={weekIndex}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function DeadlinePicker({
  control,
  setValue,
  monthIndex,
  weekIndex,
}: {
  control: Control<CourseFormValues>;
  setValue: UseFormSetValue<CourseFormValues>;
  monthIndex: number;
  weekIndex: number;
}) {
  const deadline = useWatch({
    control,
    name: `months.${monthIndex}.weeks.${weekIndex}.assessment.deadline`,
  });

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal bg-black/40 border-white/10 text-white font-mono h-9 text-sm",
            !deadline && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {deadline ? format(deadline, "PPP") : <span>Pick a date</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0 bg-black border-white/10 text-white"
        align="start"
      >
        <Calendar
          mode="single"
          selected={deadline || undefined}
          onSelect={(date) =>
            setValue(
              `months.${monthIndex}.weeks.${weekIndex}.assessment.deadline`,
              date,
              { shouldValidate: true }
            )
          }
          initialFocus
          className="bg-black text-white border-white/10"
        />
      </PopoverContent>
    </Popover>
  );
}
