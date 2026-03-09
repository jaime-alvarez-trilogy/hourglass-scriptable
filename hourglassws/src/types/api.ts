// Shared API response types

// FR1 (04-ai-brainlift): Work diary slot returned by
// GET /api/timetracking/workdiaries?assignmentId={id}&date=YYYY-MM-DD
// Each slot represents 10 minutes of tracked time.
export interface WorkDiarySlot {
  tags: string[];
  autoTracker: boolean;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  memo: string;
  actions: Array<{
    actionType: string;
    comment: string;
    actionMadeBy: number;
    createdDate: string;
  }>;
}
