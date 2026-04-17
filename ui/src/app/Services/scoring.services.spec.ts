/// <reference types="jasmine" />
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ScoringService } from './scoring.services';
import { ApiResponse } from '../Interfaces/Api-Response/api-response';
import { 
  BusinessCaseDto, 
  ScoringDimensionsDto, 
  ImpactScope, 
  RiskLevel, 
  EvaluationStatus, 
  ResponsibleDepartment, 
  ActionStep, 
  BusinessCaseResult, 
  Verdict,
  StrategicAlignmentScore,
  CustomerImpactScore,
  FinancialBenefitScore,
  FeasibilityScore,
  TimeToValueScore,
  CostScore,
  EffortScore,
  RiskScore,
  ScalabilityScore,
  DifferentiationScore,
  SustainabilityScore,
  ConfidenceScore
} from '../Interfaces/Ideas/idea-interfaces';
import { environment } from '../../environments/environment';

describe('ScoringService', () => {
  let service: ScoringService;
  let http_mock: HttpTestingController;

  const api_url = `${environment.apiUrl}/scoring`;

  // Shared test data
  const mock_business_case: BusinessCaseDto = {
    ExpectedBenefits: 'Reduced latency',
    ImpactScope: ImpactScope.Department,
    RiskLevel: RiskLevel.Low,
    EvaluationStatus: EvaluationStatus.Approved,
    OwnerDepartment: ResponsibleDepartment.IT,
    NextSteps: ActionStep.PrototypeDevelopment,
    DecisionDate: '2024-01-01',
    PlannedDurationWeeks: 12,
    CurrentStage: BusinessCaseResult.InProgress,
    Verdict: Verdict.Approved
  };

  const mock_dimensions: ScoringDimensionsDto = {
    StrategicAlignment: StrategicAlignmentScore.Strong,
    CustomerImpact: CustomerImpactScore.High,
    FinancialBenefit: FinancialBenefitScore.Moderate,
    Feasibility: FeasibilityScore.High,
    TimeToValue: TimeToValueScore.UnderThreeMonths,
    Cost: CostScore.Moderate,
    Effort: EffortScore.Moderate,
    Risk: RiskScore.Low,
    Scalability: ScalabilityScore.High,
    Differentiation: DifferentiationScore.HighDifferentiation,
    SustainabilityImpact: SustainabilityScore.StrongBenefit,
    ProjectConfidence: ConfidenceScore.High,
    Score: 85,
    ReviewerComments: 'Clear winner'
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ScoringService]
    });
    service = TestBed.inject(ScoringService);
    http_mock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http_mock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // Phase 1: Automated AI Evaluation
  describe('Phase 1: evaluateIdea()', () => {
    it('should POST to /evaluate/{ideaId}', () => {
      const mock_response: ApiResponse<void> = { success: true, message: 'Evaluation started' };

      service.evaluateIdea('idea-123').subscribe(res => {
        expect(res.success).toBeTrue();
      });

      const req = http_mock.expectOne(`${api_url}/evaluate/idea-123`);
      expect(req.request.method).toBe('POST');
      req.flush(mock_response);
    });
  });

  // Phase 2: Business Case
  describe('Phase 2: Business Case Management', () => {
    it('should POST /business-case/{ideaId} with DTO', () => {
      const mock_response: ApiResponse<void> = { success: true, message: 'ok' };

      service.submitBusinessCase('idea-123', mock_business_case).subscribe();

      const req = http_mock.expectOne(`${api_url}/business-case/idea-123`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(mock_business_case);
      req.flush(mock_response);
    });

    it('should GET /business-case/{ideaId}', () => {
      const mock_response: ApiResponse<BusinessCaseDto> = { success: true, message: 'ok', data: mock_business_case };

      service.getBusinessCase('idea-123').subscribe(res => {
        expect(res.data?.ExpectedBenefits).toBe('Reduced latency');
      });

      const req = http_mock.expectOne(`${api_url}/business-case/idea-123`);
      expect(req.request.method).toBe('GET');
      req.flush(mock_response);
    });
  });

  // Phase 3: Scoring Dimensions
  describe('Phase 3: Scoring Dimensions Management', () => {
    it('should POST /dimensions/{ideaId} with DTO', () => {
      const mock_response: ApiResponse<void> = { success: true, message: 'ok' };

      service.submitScoringDimensions('idea-123', mock_dimensions).subscribe();

      const req = http_mock.expectOne(`${api_url}/dimensions/idea-123`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(mock_dimensions);
      req.flush(mock_response);
    });

    it('should GET /dimensions/{ideaId}', () => {
      const mock_response: ApiResponse<ScoringDimensionsDto> = { success: true, message: 'ok', data: mock_dimensions };

      service.getScoringDimensions('idea-123').subscribe(res => {
        expect(res.data?.Score).toBe(85);
        expect(res.data?.ReviewerComments).toBe('Clear winner');
      });

      const req = http_mock.expectOne(`${api_url}/dimensions/idea-123`);
      expect(req.request.method).toBe('GET');
      req.flush(mock_response);
    });
  });
});
