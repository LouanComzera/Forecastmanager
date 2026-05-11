using System.ComponentModel.DataAnnotations;

namespace Comzera.StrategySuite.Api.Models;

public class StrategicForecastLine
{
    public int Id { get; set; }
    
    [Required]
    public string Description { get; set; } = string.Empty;
    
    [Required]
    public string Section { get; set; } = "Sales"; // Sales, COS, Expenses
    
    public decimal BaseAmount { get; set; }
    public double EscalationPercent { get; set; }
    
    public int CompanyId { get; set; }
    public Company? Company { get; set; }
    
    // Month-specific values (Overrides)
    public List<ForecastValue> Values { get; set; } = new();
}

public class ForecastValue
{
    public int Id { get; set; }
    public int Year { get; set; }
    public int Month { get; set; }
    public decimal Amount { get; set; }
    
    public int StrategicForecastLineId { get; set; }
}
