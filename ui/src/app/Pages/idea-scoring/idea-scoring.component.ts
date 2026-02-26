import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { IdeasService } from '../../Services/ideas.services';
import { Idea } from '../../Interfaces/Ideas/idea-interfaces';
import { ButtonsComponent } from '../../Components/buttons/buttons.component';
import { MatIconModule } from '@angular/material/icon';
import { ToastService } from '../../Services/toast.service';
import { ScoringService } from '../../Services/scoring.services';
import { ActionStep, BusinessCaseDto, BusinessCaseResult, EvaluationStatus, ImpactScope, ResponsibleDepartment, RiskLevel, Verdict, StrategicAlignmentScore, CustomerImpactScore, FinancialBenefitScore, FeasibilityScore, TimeToValueScore, CostScore, EffortScore, RiskScore, ScalabilityScore, DifferentiationScore, SustainabilityScore, ConfidenceScore, ScoringDimensionsDto } from '../../Interfaces/Ideas/idea-interfaces';

@Component({
  selector: 'app-idea-scoring',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ButtonsComponent, MatIconModule, RouterModule],
  templateUrl: './idea-scoring.component.html',
  styleUrl: './idea-scoring.component.scss',
})
export class IdeaScoringComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private ideasService = inject(IdeasService);
  private scoringService = inject(ScoringService);
  private toastService = inject(ToastService);

  groupId = '';
  ideaId = '';
  idea: Idea | null = null;
  isLoading = true;

  // Accordion state
  expandedSection: 'phase1' | 'phase2' | 'phase3' = 'phase1';

  scoringForm!: FormGroup;

  // Phase 2 Dropdown Options
  expectedBenefitsOptions = ['Time savings', 'Cost reduction', 'Improved accuracy', 'Scalability', 'Efficiency', 'Lead generation'];

  // Enum-based Options (Label/Value)
  impactScopeOptions = [
    { label: 'Department', value: ImpactScope.Department },
    { label: 'Organization Wide', value: ImpactScope.OrganizationWide },
    { label: 'External', value: ImpactScope.External }
  ];
  riskLevelOptions = [
    { label: 'Low', value: RiskLevel.Low },
    { label: 'Medium', value: RiskLevel.Medium },
    { label: 'High', value: RiskLevel.High }
  ];
  evaluationStatusOptions = [
    { label: 'Feasibility Research', value: EvaluationStatus.FeasibilityResearch },
    { label: 'Approved', value: EvaluationStatus.Approved },
    { label: 'Rejected', value: EvaluationStatus.Rejected }
  ];
  responsibleDeptOptions = [
    { label: 'Finance', value: ResponsibleDepartment.Finance },
    { label: 'IT', value: ResponsibleDepartment.IT },
    { label: 'Operations', value: ResponsibleDepartment.Operations },
    { label: 'Marketing & Sales', value: ResponsibleDepartment.MarketingAndSales },
    { label: 'Strategy & Compliance', value: ResponsibleDepartment.StrategyAndCompliance }
  ];
  actionStepOptions = [
    { label: 'Prototype Development', value: ActionStep.PrototypeDevelopment },
    { label: 'Stakeholder Review', value: ActionStep.StakeholderReview },
    { label: 'Pilot Launch', value: ActionStep.PilotLaunch },
    { label: 'Market Feasibility Study', value: ActionStep.MarketFeasibilityStudy },
    { label: 'Rollout Planning', value: ActionStep.RolloutPlanning }
  ];
  resultOutcomeOptions = [
    { label: 'In Progress', value: BusinessCaseResult.InProgress },
    { label: 'Pilot Stage', value: BusinessCaseResult.PilotStage },
    { label: 'Awaiting Results', value: BusinessCaseResult.AwaitingResults }
  ];
  verdictOptions = [
    { label: 'Approved', value: Verdict.Approved },
    { label: 'Awaiting Review', value: Verdict.AwaitingReview },
    { label: 'Park', value: Verdict.Park }
  ];

  // Phase 3 Metric Options
  strategicAlignmentScores = [
    { label: 'No Alignment', value: StrategicAlignmentScore.NoAlignment },
    { label: 'Low', value: StrategicAlignmentScore.Low },
    { label: 'Moderate', value: StrategicAlignmentScore.Moderate },
    { label: 'Strong', value: StrategicAlignmentScore.Strong },
    { label: 'Full Alignment', value: StrategicAlignmentScore.Full }
  ];
  customerImpactScores = [
    { label: 'Minimal', value: CustomerImpactScore.Minimal },
    { label: 'Low', value: CustomerImpactScore.Low },
    { label: 'Moderate', value: CustomerImpactScore.Moderate },
    { label: 'High', value: CustomerImpactScore.High },
    { label: 'Transformational', value: CustomerImpactScore.Transformational }
  ];
  financialBenefitScores = [
    { label: 'No Gain', value: FinancialBenefitScore.NoGain },
    { label: 'Low', value: FinancialBenefitScore.Low },
    { label: 'Moderate', value: FinancialBenefitScore.Moderate },
    { label: 'High', value: FinancialBenefitScore.High },
    { label: 'Breakthrough', value: FinancialBenefitScore.Breakthrough }
  ];
  feasibilityScores = [
    { label: 'Very Difficult', value: FeasibilityScore.VeryDifficult },
    { label: 'Low', value: FeasibilityScore.Low },
    { label: 'Moderate', value: FeasibilityScore.Moderate },
    { label: 'High', value: FeasibilityScore.High },
    { label: 'Very Feasible', value: FeasibilityScore.VeryFeasible }
  ];
  timeToValueScores = [
    { label: 'Over 24 Months', value: TimeToValueScore.Over24Months },
    { label: '12-24 Months', value: TimeToValueScore.TwelveToTwentyFour },
    { label: '6-12 Months', value: TimeToValueScore.SixToTwelve },
    { label: '3-6 Months', value: TimeToValueScore.ThreeToSix },
    { label: 'Under 3 Months', value: TimeToValueScore.UnderThreeMonths }
  ];
  costScores = [
    { label: 'Very High', value: CostScore.VeryHigh },
    { label: 'High', value: CostScore.High },
    { label: 'Moderate', value: CostScore.Moderate },
    { label: 'Low', value: CostScore.Low },
    { label: 'Very Low', value: CostScore.VeryLow }
  ];
  effortScores = [
    { label: 'Very High', value: EffortScore.VeryHigh },
    { label: 'High', value: EffortScore.High },
    { label: 'Moderate', value: EffortScore.Moderate },
    { label: 'Low', value: EffortScore.Low },
    { label: 'Very Low', value: EffortScore.VeryLow }
  ];
  riskScores = [
    { label: 'Very High', value: RiskScore.VeryHigh },
    { label: 'High', value: RiskScore.High },
    { label: 'Moderate', value: RiskScore.Moderate },
    { label: 'Low', value: RiskScore.Low },
    { label: 'Very Low', value: RiskScore.VeryLow }
  ];
  scalabilityScores = [
    { label: 'Not Scalable', value: ScalabilityScore.NotScalable },
    { label: 'Low', value: ScalabilityScore.Low },
    { label: 'Moderate', value: ScalabilityScore.Moderate },
    { label: 'High', value: ScalabilityScore.High },
    { label: 'Fully Scalable', value: ScalabilityScore.FullyScalable }
  ];
  differentiationScores = [
    { label: 'No Differentiation', value: DifferentiationScore.NoDifferentiation },
    { label: 'Low Uniqueness', value: DifferentiationScore.LowUniqueness },
    { label: 'Moderate Uniqueness', value: DifferentiationScore.ModerateUniqueness },
    { label: 'High Differentiation', value: DifferentiationScore.HighDifferentiation },
    { label: 'Unique Strong IP', value: DifferentiationScore.UniqueStrongIP }
  ];
  sustainabilityScores = [
    { label: 'Negative Impact', value: SustainabilityScore.NegativeImpact },
    { label: 'Minimal Benefit', value: SustainabilityScore.MinimalBenefit },
    { label: 'Moderate Benefit', value: SustainabilityScore.ModerateBenefit },
    { label: 'Strong Benefit', value: SustainabilityScore.StrongBenefit },
    { label: 'Major Benefit', value: SustainabilityScore.MajorBenefit }
  ];
  confidenceScores = [
    { label: 'Very Low', value: ConfidenceScore.VeryLow },
    { label: 'Low', value: ConfidenceScore.Low },
    { label: 'Moderate', value: ConfidenceScore.Moderate },
    { label: 'High', value: ConfidenceScore.High },
    { label: 'Very High', value: ConfidenceScore.VeryHigh }
  ];

  ngOnInit(): void {
    this.groupId = this.route.snapshot.paramMap.get('groupId') || '';
    this.ideaId = this.route.snapshot.paramMap.get('ideaId') || '';

    this.initForm();
    this.loadIdea();
  }

  initForm(): void {
    this.scoringForm = this.fb.group({
      // Phase 1: Idea Evaluation
      Phase1: this.fb.group({
        Score: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
        Notes: ['']
      }),
      // Phase 2: Business Case
      Phase2: this.fb.group({
        ExpectedBenefits: ['', Validators.required],
        ImpactScope: ['', Validators.required],
        RiskLevel: ['', Validators.required],
        EvaluationStatus: ['', Validators.required],
        OwnerDepartment: ['', Validators.required],
        NextSteps: ['', Validators.required],
        DecisionDate: ['', Validators.required],
        PlannedDurationWeeks: ['', [Validators.required, Validators.min(1)]],
        CurrentStage: [BusinessCaseResult.InProgress, Validators.required],
        Verdict: ['', Validators.required]
      }),
      // Phase 3: Scoring Dimensions
      Phase3: this.fb.group({
        StrategicAlignment: ['', Validators.required],
        CustomerImpact: ['', Validators.required],
        FinancialBenefit: ['', Validators.required],
        Feasibility: ['', Validators.required],
        TimeToValue: ['', Validators.required],
        Cost: ['', Validators.required],
        Effort: ['', Validators.required],
        Risk: ['', Validators.required],
        Scalability: ['', Validators.required],
        Differentiation: ['', Validators.required],
        SustainabilityImpact: ['', Validators.required],
        ProjectConfidence: ['', Validators.required],
        ReviewerComments: ['', Validators.required]
      })
    });
  }

  updatePhase1Score(): void {
    if (!this.ideaId) return;

    const score = this.scoringForm.get('Phase1.Score')?.value;
    const update = { Score: score };

    console.log('Syncing Phase 1 Score:', update);
    this.isLoading = true;

    this.ideasService.updateIdea(this.ideaId, update).subscribe({
      next: (res) => {
        if (res.success) {
          this.toastService.show('Evaluation score updated successfully', 'success');
          if (this.idea) {
            this.idea.Score = score;
          }
        } else {
          this.toastService.show(res.message || 'Failed to update score', 'error');
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Update Phase 1 Score failed:', err);
        this.toastService.show('Failed to sync score with backend', 'error');
        this.isLoading = false;
      }
    });
  }

  loadIdea(): void {
    this.isLoading = true;
    this.ideasService.getIdea(this.groupId, this.ideaId).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.idea = res.data;
          if (this.idea) {
            // Pre-populate Phase 1 if data exists
            const score = this.idea.score ?? this.idea.Score ?? 0;
            const notes = this.idea.notes ?? this.idea.Notes ?? '';
            this.scoringForm.get('Phase1.Score')?.patchValue(score);
            this.scoringForm.get('Phase1.Notes')?.patchValue(notes);
          }
        }
        this.isLoading = false;
      },
      error: () => {
        this.toastService.show('Failed to load idea details', 'error');
        this.isLoading = false;
      }
    });
  }

  toggleSection(section: 'phase1' | 'phase2' | 'phase3'): void {
    if (this.isSectionLocked(section)) return;
    this.expandedSection = this.expandedSection === section ? 'phase1' : section;
  }

  isSectionLocked(section: 'phase1' | 'phase2' | 'phase3'): boolean {
    if (section === 'phase1') return false;

    if (section === 'phase2') {
      const p1Score = this.scoringForm.get('Phase1.Score')?.value;
      return p1Score < 70;
    }

    if (section === 'phase3') {
      if (this.isSectionLocked('phase2')) return true;
      const verdict = this.scoringForm.get('Phase2.Verdict')?.value;
      return (verdict as any) !== Verdict.Approved;
    }

    return false;
  }

  get totalPhase3Score(): number {
    const p3 = this.scoringForm.get('Phase3')?.value;
    if (!p3) return 0;

    // Specific mappings to handle label overlaps correctly
    const scores: { [key: string]: number } = {
      // Names match Enum values from idea-interfaces.ts
      'NoAlignment': 1, 'Low': 2, 'Moderate': 3, 'Strong': 4, 'Full': 5,
      'Minimal': 1, 'High': 4, 'Transformational': 5,
      'NoGain': 1, 'Breakthrough': 5,
      'VeryDifficult': 1, 'VeryFeasible': 5,
      'Over24Months': 1, 'TwelveToTwentyFour': 2, 'SixToTwelve': 3, 'ThreeToSix': 4, 'UnderThreeMonths': 5,
      'VeryHigh': 1, 'VeryLow': 5, // For Cost/Effort/Risk (High = Bad = 1, Low = Good = 5)
      'NotScalable': 1, 'FullyScalable': 5,
      'NoDifferentiation': 1, 'LowUniqueness': 2, 'ModerateUniqueness': 3, 'HighDifferentiation': 4, 'UniqueStrongIP': 5,
      'NegativeImpact': 1, 'MinimalBenefit': 2, 'ModerateBenefit': 3, 'StrongBenefit': 4, 'MajorBenefit': 5,
      // Confidence Score (VeryLow=1, VeryHigh=5)
      'C_VeryLow': 1, 'C_Low': 2, 'C_Moderate': 3, 'C_High': 4, 'C_VeryHigh': 5
    };

    const getScore = (val: string, metric?: string): number => {
      if (metric === 'ProjectConfidence') {
        return scores['C_' + val] || 0;
      }
      return scores[val] || 0;
    };

    const values = [
      getScore(p3.StrategicAlignment),
      getScore(p3.CustomerImpact),
      getScore(p3.FinancialBenefit),
      getScore(p3.Feasibility),
      getScore(p3.TimeToValue),
      getScore(p3.Cost),
      getScore(p3.Effort),
      getScore(p3.Risk),
      getScore(p3.Scalability),
      getScore(p3.Differentiation),
      getScore(p3.SustainabilityImpact),
      getScore(p3.ProjectConfidence, 'ProjectConfidence')
    ];

    return values.reduce((a, b) => a + b, 0);
  }

  onSubmitPhase2(): void {
    const phase2Group = this.scoringForm.get('Phase2');
    if (phase2Group?.invalid) {
      this.toastService.show('Please complete all Phase 2 fields', 'info');
      return;
    }

    const dto: BusinessCaseDto = phase2Group?.value;

    this.scoringService.submitBusinessCase(this.ideaId, dto).subscribe({
      next: (res) => {
        if (res.success) {
          this.toastService.show('Business Case submitted successfully', 'success');
          // If approved, expand Phase 3
          if (dto.Verdict === Verdict.Approved) {
            this.expandedSection = 'phase3';
          }
        } else {
          this.toastService.show(res.message || 'Submission failed', 'error');
        }
      },
      error: (err) => {
        this.toastService.show('Failed to submit business case', 'error');
        console.error(err);
      }
    });
  }

  onSubmit(): void {
    const phase3Group = this.scoringForm.get('Phase3');
    if (phase3Group?.invalid) {
      this.toastService.show('Please complete all Scoring Dimensions', 'info');
      return;
    }

    const dto: ScoringDimensionsDto = {
      ...phase3Group?.value,
      Score: this.totalPhase3Score
    };

    console.log('Phase 3 Submission Payload:', dto);

    this.scoringService.submitScoringDimensions(this.ideaId, dto).subscribe({
      next: (res) => {
        console.log('Phase 3 Submission Response:', res);
        if (res.success) {
          this.toastService.show('Final Scoring Dimensions submitted successfully', 'success');
          this.router.navigate([`/groups/${this.groupId}/ideas`]);
        } else {
          this.toastService.show(res.message || 'Submission failed', 'error');
        }
      },
      error: (err) => {
        console.error('Phase 3 API Error:', err);
        this.toastService.show('Failed to submit final score', 'error');
      }
    });
  }

  goBack(): void {
    this.router.navigate([`/groups/${this.groupId}/ideas`]);
  }
}
