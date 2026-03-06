import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { IdeasService } from '../../Services/ideas.services';
import { Idea, PromoteRequest } from '../../Interfaces/Ideas/idea-interfaces';
import { ButtonsComponent } from '../../Components/buttons/buttons.component';
import { MatIconModule } from '@angular/material/icon';
import { ToastService } from '../../Services/toast.service';
import { ScoringService } from '../../Services/scoring.services';
import { ActionStep, BusinessCaseDto, BusinessCaseResult, EvaluationStatus, ImpactScope, ResponsibleDepartment, RiskLevel, Verdict, StrategicAlignmentScore, CustomerImpactScore, FinancialBenefitScore, FeasibilityScore, TimeToValueScore, CostScore, EffortScore, RiskScore, ScalabilityScore, DifferentiationScore, SustainabilityScore, ConfidenceScore, ScoringDimensionsDto, ScoringStage } from '../../Interfaces/Ideas/idea-interfaces';
import { ProjectService } from '../../Services/project.service';
import { CommitteeMembersService } from '../../Services/committeemembers.service';
import { CreateProjectRequest } from '../../Interfaces/Projects/project-interface';
import { AuthService } from '../../Services/auth/auth.service';

@Component({
  selector: 'app-idea-scoring',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, ButtonsComponent, MatIconModule, RouterModule],
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
  private projectService = inject(ProjectService);
  private committeeService = inject(CommitteeMembersService);
  private authService = inject(AuthService);

  groupId = '';
  ideaId = '';
  idea: Idea | null = null;
  isLoading = true;
  parsedReasoning: { label: string, content: string }[] = [];

  // Promotion state
  showProjectModal = false;
  isPromoting = false;
  allUsers: any[] = [];
  projectData: CreateProjectRequest = {
    title: '',
    description: '',
    overseenByEmail: ''
  };

  // Accordion state
  expandedSection: 'phase1' | 'phase2' | 'phase3' | 'phase4' | null = 'phase1';

  scoringForm!: FormGroup;

  // Phase 2 Dropdown Options
  expectedBenefitsOptions = [
    { label: 'Time savings', value: 'Time savings', tip: 'This idea will save people time on repetitive or manual tasks' },
    { label: 'Cost reduction', value: 'Cost reduction', tip: 'This idea will directly reduce business costs or spending' },
    { label: 'Improved accuracy', value: 'Improved accuracy', tip: 'This idea will reduce errors and improve data or process quality' },
    { label: 'Scalability', value: 'Scalability', tip: 'This idea will help the business handle more work without adding resources' },
    { label: 'Efficiency', value: 'Efficiency', tip: 'This idea will make existing workflows faster or smoother' },
    { label: 'Lead generation', value: 'Lead generation', tip: 'This idea will help bring in new customers or business opportunities' }
  ];

  // Enum-based Options (Label/Value)
  impactScopeOptions = [
    { label: 'Department', value: ImpactScope.Department, tip: 'Only affects one team or department' },
    { label: 'Organization Wide', value: ImpactScope.OrganizationWide, tip: 'Affects the entire company across multiple teams' },
    { label: 'External', value: ImpactScope.External, tip: 'Affects customers, partners, or people outside the company' }
  ];
  riskLevelOptions = [
    { label: 'Low', value: RiskLevel.Low, tip: 'Minimal chance of problems — safe to try' },
    { label: 'Medium', value: RiskLevel.Medium, tip: 'Some risks exist but they can be managed' },
    { label: 'High', value: RiskLevel.High, tip: 'Significant risks — needs careful planning before starting' }
  ];
  evaluationStatusOptions = [
    { label: 'Feasibility Research', value: EvaluationStatus.FeasibilityResearch, tip: 'Still researching whether this idea is doable' },
    { label: 'Approved', value: EvaluationStatus.Approved, tip: 'This idea has been reviewed and approved to move forward' },
    { label: 'Rejected', value: EvaluationStatus.Rejected, tip: 'This idea has been reviewed and will not be pursued' }
  ];
  responsibleDeptOptions = [
    { label: 'Finance', value: ResponsibleDepartment.Finance, tip: 'The Finance team will own this' },
    { label: 'IT', value: ResponsibleDepartment.IT, tip: 'The IT / Technology team will own this' },
    { label: 'Operations', value: ResponsibleDepartment.Operations, tip: 'The Operations team will own this' },
    { label: 'Marketing & Sales', value: ResponsibleDepartment.MarketingAndSales, tip: 'The Marketing or Sales team will own this' },
    { label: 'Strategy & Compliance', value: ResponsibleDepartment.StrategyAndCompliance, tip: 'The Strategy or Compliance team will own this' }
  ];
  actionStepOptions = [
    { label: 'Prototype Development', value: ActionStep.PrototypeDevelopment, tip: 'Build a small working version to test the concept' },
    { label: 'Stakeholder Review', value: ActionStep.StakeholderReview, tip: 'Present to key decision-makers for feedback' },
    { label: 'Pilot Launch', value: ActionStep.PilotLaunch, tip: 'Run a small-scale trial with real users' },
    { label: 'Market Feasibility Study', value: ActionStep.MarketFeasibilityStudy, tip: 'Research market demand and competition first' },
    { label: 'Rollout Planning', value: ActionStep.RolloutPlanning, tip: 'Plan the full launch across the business' }
  ];
  resultOutcomeOptions = [
    { label: 'In Progress', value: BusinessCaseResult.InProgress, tip: 'Work is actively underway' },
    { label: 'Pilot Stage', value: BusinessCaseResult.PilotStage, tip: 'Being tested with a small group first' },
    { label: 'Awaiting Results', value: BusinessCaseResult.AwaitingResults, tip: 'Waiting for data or feedback before deciding' }
  ];
  verdictOptions = [
    { label: 'Approved', value: Verdict.Approved, tip: 'Go ahead — this idea is approved to proceed to scoring' },
    { label: 'Awaiting Review', value: Verdict.AwaitingReview, tip: 'Not yet decided — still under review' },
    { label: 'Park', value: Verdict.Park, tip: 'Put on hold — may be revisited later' }
  ];

  // Phase 3 Metric Options
  strategicAlignmentScores = [
    { label: 'Low', value: StrategicAlignmentScore.Low, tip: 'Indirect or weak alignment with core objectives' },
    { label: 'Moderate', value: StrategicAlignmentScore.Moderate, tip: 'Supports key goals but not a primary driver' },
    { label: 'High', value: StrategicAlignmentScore.Strong, tip: 'Directly and strongly supports top organizational priorities' },
  ];
  customerImpactScores = [
    { label: 'Low', value: CustomerImpactScore.Low, tip: 'Minimal or indirect benefit to users/stakeholders' },
    { label: 'Moderate', value: CustomerImpactScore.Moderate, tip: 'Noticeable improvement for a specific user segment' },
    { label: 'High', value: CustomerImpactScore.High, tip: 'Significant positive transformation for large user groups' },
  ];
  financialBenefitScores = [
    { label: 'Low', value: FinancialBenefitScore.Low, tip: 'Low or speculative ROI/revenue gain' },
    { label: 'Moderate', value: FinancialBenefitScore.Moderate, tip: 'Solid return with moderate impact on bottom line' },
    { label: 'High', value: FinancialBenefitScore.High, tip: 'Major revenue potential or significant cost savings' },
  ];
  feasibilityScores = [
    { label: 'Very Difficult', value: FeasibilityScore.VeryDifficult, tip: 'Extremely complex or requires non-existent tech/skills' },
    { label: 'Moderate', value: FeasibilityScore.Moderate, tip: 'Challenging but doable with existing resources' },
    { label: 'High', value: FeasibilityScore.High, tip: 'Straightforward implementation using proven methods' },
  ];
  timeToValueScores = [
    { label: 'Over 6 Months', value: TimeToValueScore.SixToTwelve, tip: 'Long-term project with delayed realization of benefits' },
    { label: '3-6 Months', value: TimeToValueScore.ThreeToSix, tip: 'Average implementation timeline' },
    { label: 'Under 3 Months', value: TimeToValueScore.UnderThreeMonths, tip: 'Quick win with immediate impact' }
  ];
  costScores = [
    { label: 'High', value: CostScore.High, tip: 'Requires significant budget and resource allocation' },
    { label: 'Moderate', value: CostScore.Moderate, tip: 'Reasonable cost within standard project budgets' },
    { label: 'Low', value: CostScore.Low, tip: 'Minimal financial investment required' },
  ];
  effortScores = [
    { label: 'High', value: EffortScore.High, tip: 'Heavy workload requiring multiple teams or long hours' },
    { label: 'Moderate', value: EffortScore.Moderate, tip: 'Steady effort manageable by a dedicated team' },
    { label: 'Low', value: EffortScore.Low, tip: 'Simple tasks that can be completed quickly' },
  ];
  riskScores = [
    { label: 'High', value: RiskScore.High, tip: 'High chance of failure or significant negative impact' },
    { label: 'Moderate', value: RiskScore.Moderate, tip: 'Predictable risks that can be mitigated' },
    { label: 'Low', value: RiskScore.Low, tip: 'Safe bet with minimal potential for error' },
  ];
  scalabilityScores = [
    { label: 'Low', value: ScalabilityScore.Low, tip: 'Hard to expand or reuse beyond initial scope' },
    { label: 'Moderate', value: ScalabilityScore.Moderate, tip: 'Can be adapted for larger use cases with some effort' },
    { label: 'High', value: ScalabilityScore.High, tip: 'Built for growth and easy deployment across the org' },
  ];
  differentiationScores = [
    { label: 'Low Uniqueness', value: DifferentiationScore.LowUniqueness, tip: 'Common solution readily available elsewhere' },
    { label: 'Moderate Uniqueness', value: DifferentiationScore.ModerateUniqueness, tip: 'Offers some unique value or improvements' },
    { label: 'High Uniqueness', value: DifferentiationScore.HighDifferentiation, tip: 'Highly innovative and provides a competitive edge' },
  ];
  sustainabilityScores = [
    { label: 'Minimal Benefit', value: SustainabilityScore.MinimalBenefit, tip: 'No significant ESG or long-term sustainability impact' },
    { label: 'Moderate Benefit', value: SustainabilityScore.ModerateBenefit, tip: 'Positive contribution to sustainability goals' },
    { label: 'Strong Benefit', value: SustainabilityScore.StrongBenefit, tip: 'Major driver for eco-friendly or social responsibility' },
  ];
  confidenceScores = [
    { label: 'Low', value: ConfidenceScore.Low, tip: 'Highly uncertain; many assumptions require validation' },
    { label: 'Moderate', value: ConfidenceScore.Moderate, tip: 'Reasonable data exists to support the business case' },
    { label: 'High', value: ConfidenceScore.High, tip: 'Very high certainty based on detailed research and data' },
  ];

  ngOnInit(): void {
    this.groupId = this.route.snapshot.paramMap.get('groupId') || '';
    this.ideaId = this.route.snapshot.paramMap.get('ideaId') || '';

    this.initForm();
    this.loadIdea();
    this.loadAllUsers();
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

  clampScore(event: Event): void {
    const input = event.target as HTMLInputElement;
    let value = parseFloat(input.value);
    if (!isNaN(value)) {
      if (value > 100) value = 100;
      if (value < 0) value = 0;
      input.value = value.toString();
      this.scoringForm.get('Phase1.Score')?.setValue(value, { emitEvent: false });
    }
    this.scoringForm.get('Phase1.Score')?.markAsTouched();
  }

  updatePhase1Score(): void {
    if (!this.ideaId) return;

    const score = this.scoringForm.get('Phase1.Score')?.value;
    const update = { Score: score };

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
        this.toastService.show(err.error?.message || 'Error updating score', 'error');
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
          const d: any = this.idea;
          const score = d.score ?? d.Score ?? 0;
          const reasoning = d.aiReasoning ?? d.AiReasoning ?? '';

          this.parsedReasoning = this.formatReasoning(reasoning);
          this.scoringForm.get('Phase1.Score')?.patchValue(score);

          this.initializeProjectData();
          this.loadScoringData();
        }
        this.isLoading = false;
      },
      error: () => {
        this.toastService.show('Failed to load idea details', 'error');
        this.isLoading = false;
      }
    });
  }

  loadScoringData(): void {
    if (!this.ideaId) return;

    // Load Phase 2: Business Case
    this.scoringService.getBusinessCase(this.ideaId).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          const d: any = res.data;

          // Helper to map integer enums to strings
          const mapEnum = (val: any, enumObj: any) => {
            if (typeof val === 'number') {
              const keys = Object.keys(enumObj);
              // In TS enums with string values, Object.keys returns the keys.
              // We need to find the key whose index matches the value if it was an int enum.
              // However, it's safer to just map explicitly or use the fact that backend ints
              // usually correspond to the order of definition.
              return keys[val] || keys[0];
            }
            return val;
          };

          this.scoringForm.get('Phase2')?.patchValue({
            ExpectedBenefits: d.expectedBenefits ?? d.ExpectedBenefits ?? '',
            ImpactScope: mapEnum(d.impactScope ?? d.ImpactScope, ImpactScope),
            RiskLevel: mapEnum(d.riskLevel ?? d.RiskLevel, RiskLevel),
            EvaluationStatus: mapEnum(d.evaluationStatus ?? d.EvaluationStatus, EvaluationStatus),
            OwnerDepartment: mapEnum(d.ownerDepartment ?? d.OwnerDepartment, ResponsibleDepartment),
            NextSteps: mapEnum(d.nextSteps ?? d.NextSteps, ActionStep),
            DecisionDate: (d.decisionDate ?? d.DecisionDate ?? '').toString().substring(0, 10),
            PlannedDurationWeeks: d.plannedDurationWeeks ?? d.PlannedDurationWeeks ?? '',
            CurrentStage: mapEnum(d.currentStage ?? d.CurrentStage, BusinessCaseResult),
            Verdict: mapEnum(d.verdict ?? d.Verdict, Verdict)
          });

          // Auto-expand based on idea stage
          const currentStage = (this.idea as any)?.currentStage ?? (this.idea as any)?.CurrentStage;
          if (currentStage === 'BusinessCase' || currentStage === 'ScoringDimensions' || currentStage === 'Completed' || currentStage === 3 || currentStage === ScoringStage.Accepted) {
            this.expandedSection = 'phase2';
          }
        }
      }
    });

    // Load Phase 3: Scoring Dimensions
    this.scoringService.getScoringDimensions(this.ideaId).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          const d: any = res.data;

          const mapEnum = (val: any, enumObj: any) => {
            if (typeof val === 'number') {
              const keys = Object.keys(enumObj);
              return keys[val] || keys[0];
            }
            return val;
          };

          this.scoringForm.get('Phase3')?.patchValue({
            StrategicAlignment: mapEnum(d.strategicAlignment ?? d.StrategicAlignment, StrategicAlignmentScore),
            CustomerImpact: mapEnum(d.customerImpact ?? d.CustomerImpact, CustomerImpactScore),
            FinancialBenefit: mapEnum(d.financialBenefit ?? d.FinancialBenefit, FinancialBenefitScore),
            Feasibility: mapEnum(d.feasibility ?? d.Feasibility, FeasibilityScore),
            TimeToValue: mapEnum(d.timeToValue ?? d.TimeToValue, TimeToValueScore),
            Cost: mapEnum(d.cost ?? d.Cost, CostScore),
            Effort: mapEnum(d.effort ?? d.Effort, EffortScore),
            Risk: mapEnum(d.risk ?? d.Risk, RiskScore),
            Scalability: mapEnum(d.scalability ?? d.Scalability, ScalabilityScore),
            Differentiation: mapEnum(d.differentiation ?? d.Differentiation, DifferentiationScore),
            SustainabilityImpact: mapEnum(d.sustainabilityImpact ?? d.SustainabilityImpact, SustainabilityScore),
            ProjectConfidence: mapEnum(d.projectConfidence ?? d.ProjectConfidence, ConfidenceScore),
            ReviewerComments: d.reviewerComments ?? d.ReviewerComments ?? ''
          });

          // Auto-expand if in Phase 3 or Completed
          const currentStage = (this.idea as any)?.currentStage ?? (this.idea as any)?.CurrentStage;
          if (currentStage === 'ScoringDimensions' || currentStage === 'Completed' || currentStage === 3 || currentStage === ScoringStage.Accepted) {
            this.expandedSection = 'phase3';
          }
        }
      }
    });
  }

  private initializeProjectData(): void {
    if (!this.idea) {
      console.warn('InitializeProjectData called with null idea');
      return;
    }

    const ideaObj = this.idea as any;

    const finalTitle = this.idea.Title || ideaObj.title || ideaObj.Title || '';
    const finalDescription = this.idea.ProposedSolution || ideaObj.proposedSolution || ideaObj.ProposedSolution || '';

    this.projectData = {
      title: finalTitle,
      description: finalDescription,
      overseenByEmail: this.projectData.overseenByEmail || ''
    };

    console.log('Project data initialized:', this.projectData);
  }

  toggleSection(section: 'phase1' | 'phase2' | 'phase3' | 'phase4'): void {
    if (this.isSectionLocked(section)) return;
    this.expandedSection = this.expandedSection === section ? null : section;

    if (this.expandedSection === 'phase4') {
      this.initializeProjectData();
    }
  }

  isSectionLocked(section: 'phase1' | 'phase2' | 'phase3' | 'phase4'): boolean {
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

    if (section === 'phase4') {
      return !this.isAccepted;
    }

    return false;
  }

  get totalPhase3Score(): number {
    const p3 = this.scoringForm.get('Phase3')?.value;
    if (!p3) return 0;

    const getMetricScore = (val: string, metric: string): number => {
      switch (metric) {
        case 'StrategicAlignment':
          return val === 'Low' ? 1 : val === 'Moderate' ? 2 : val === 'Strong' ? 3 : 0;
        case 'CustomerImpact':
        case 'FinancialBenefit':
        case 'Scalability':
        case 'ProjectConfidence':
          return val === 'Low' ? 1 : val === 'Moderate' ? 2 : val === 'High' ? 3 : 0;
        case 'Feasibility':
          return val === 'VeryDifficult' ? 1 : val === 'Moderate' ? 2 : val === 'High' ? 3 : 0;
        case 'TimeToValue':
          return val === 'SixToTwelve' ? 1 : val === 'ThreeToSix' ? 2 : val === 'UnderThreeMonths' ? 3 : 0;
        case 'Cost':
        case 'Effort':
        case 'Risk':
          return val === 'High' ? 1 : val === 'Moderate' ? 2 : val === 'Low' ? 3 : 0;
        case 'Differentiation':
          return val === 'LowUniqueness' ? 1 : val === 'ModerateUniqueness' ? 2 : val === 'HighDifferentiation' ? 3 : 0;
        case 'SustainabilityImpact':
          return val === 'MinimalBenefit' ? 1 : val === 'ModerateBenefit' ? 2 : val === 'StrongBenefit' ? 3 : 0;
        default:
          return 0;
      }
    };

    return getMetricScore(p3.StrategicAlignment, 'StrategicAlignment') +
      getMetricScore(p3.CustomerImpact, 'CustomerImpact') +
      getMetricScore(p3.FinancialBenefit, 'FinancialBenefit') +
      getMetricScore(p3.Feasibility, 'Feasibility') +
      getMetricScore(p3.TimeToValue, 'TimeToValue') +
      getMetricScore(p3.Cost, 'Cost') +
      getMetricScore(p3.Effort, 'Effort') +
      getMetricScore(p3.Risk, 'Risk') +
      getMetricScore(p3.Scalability, 'Scalability') +
      getMetricScore(p3.Differentiation, 'Differentiation') +
      getMetricScore(p3.SustainabilityImpact, 'SustainabilityImpact') +
      getMetricScore(p3.ProjectConfidence, 'ProjectConfidence');
  }

  onSubmitPhase2(): void {
    const phase2Group = this.scoringForm.get('Phase2');
    if (phase2Group?.invalid) {
      this.toastService.show('Please complete all required Phase 2 fields', 'info');
      phase2Group.markAllAsTouched();
      return;
    }

    const dto: BusinessCaseDto = phase2Group?.value;

    this.scoringService.submitBusinessCase(this.ideaId, dto).subscribe({
      next: (res) => {
        if (res.success) {
          this.toastService.show('Business Case submitted successfully', 'success');
          if (dto.Verdict === Verdict.Approved) {
            this.expandedSection = 'phase3';
          }
        } else {
          this.toastService.show(res.message || 'Submission failed', 'error');
        }
      },
      error: (err) => {
        this.toastService.show(err.error?.message || 'Error submitting business case', 'error');
      }
    });
  }

  onSubmitPhase3(): void {
    const phase3Group = this.scoringForm.get('Phase3');
    if (phase3Group?.invalid) {
      this.toastService.show('Please complete all Scoring Dimensions', 'info');
      phase3Group.markAllAsTouched();
      return;
    }

    const dto: ScoringDimensionsDto = {
      ...phase3Group?.value,
      Score: this.totalPhase3Score
    };


    this.scoringService.submitScoringDimensions(this.ideaId, dto).subscribe({
      next: (res) => {
        if (res.success) {
          this.toastService.show('Final Scoring Dimensions submitted successfully', 'success');

          this.loadIdea();

          // Auto-expand Phase 4 if accepted
          setTimeout(() => {
            if (this.isAccepted && !this.idea?.isPromotedToProject) {
              this.expandedSection = 'phase4';
              this.initializeProjectData();
            }
          }, 800);
        } else {
          this.toastService.show(res.message || 'Submission failed', 'error');
        }
      },
      error: (err) => {
        this.toastService.show(err.error?.message || 'Error submitting scoring dimensions', 'error');
      }
    });
  }

  goBack(): void {
    this.router.navigate([`/groups/${this.groupId}/ideas`]);
  }

  formatReasoning(text: string): { label: string, content: string }[] {
    if (!text) return [];

    const sections = [
      'Strategic alignment',
      'Problem viability',
      'Solution feasibility',
      'Business impact',
      'Overall assessment'
    ];

    const result: { label: string, content: string }[] = [];
    const labelPattern = new RegExp(`(${sections.join('|')}):`, 'gi');
    const parts = text.split(labelPattern);

    for (let i = 1; i < parts.length; i += 2) {
      const label = parts[i];
      let content = parts[i + 1] || '';
      content = content.trim().replace(/^[:\s-]+/, '').trim();

      if (label && content) {
        const normalizedLabel = label.charAt(0).toUpperCase() + label.slice(1).toLowerCase();
        result.push({ label: normalizedLabel, content });
      }
    }

    if (result.length === 0) {
      result.push({ label: 'Analysis', content: text });
    }

    return result;
  }

  loadAllUsers(): void {
    this.committeeService.getAllUsers().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.allUsers = res.data;
        }
      },
      error: () => {
        this.toastService.show('Failed to load user list for overseer selection', 'error');
      }
    });
  }

  createProjectFromIdea(): void {
    if (!this.idea || !this.projectData.overseenByEmail || !this.projectData.title) {
      this.toastService.show('Please complete all required fields', 'error');
      return;
    }

    this.isPromoting = true;

    const promoteRequest: PromoteRequest = {
      groupId: this.groupId,
      ideaId: this.ideaId
    };

    this.ideasService.promoteIdea(promoteRequest).subscribe({
      next: (promoteRes) => {
        if (promoteRes.success) {
          this.projectService.createProject(
            this.groupId,
            this.ideaId,
            this.projectData
          ).subscribe({
            next: (createRes) => {
              if (createRes.success) {
                this.toastService.show('Idea promoted to project successfully!', 'success');
                if (this.idea) {
                  this.idea.isPromotedToProject = true;
                }
              } else {
                this.toastService.show(createRes.message || 'Project creation failed', 'error');
              }
              this.isPromoting = false;
            },
            error: (err) => {
              this.toastService.show(err.error?.message || 'Error creating project', 'error');
              this.isPromoting = false;
            }
          });
        } else {
          this.toastService.show(promoteRes.message || 'Promotion failed', 'error');
          this.isPromoting = false;
        }
      },
      error: (err) => {
        this.toastService.show(err.error?.message || 'Error promoting idea', 'error');
        this.isPromoting = false;
      }
    });
  }

  get isAccepted(): boolean {
    const stage = (this.idea as any)?.currentStage ?? (this.idea as any)?.CurrentStage;
    return stage === 3 || stage === ScoringStage.Accepted || stage === 'Accepted' || (this.idea as any)?.status === 'Accepted';
  }
}
