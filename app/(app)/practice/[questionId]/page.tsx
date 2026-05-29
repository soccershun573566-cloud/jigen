import { PracticeRunner } from '@/components/practice/PracticeRunner';
import { getPracticeQuestion } from '@/lib/mock/dashboard-data';

interface Props {
  params: { questionId: string };
}

// S06 演習画面(1問1画面)
export default function QuestionPage({ params }: Props) {
  const question = getPracticeQuestion(params.questionId);
  return <PracticeRunner question={question} />;
}
