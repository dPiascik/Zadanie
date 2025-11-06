using System;

public class PositionData
{
    public int Id { get; set; }
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public bool IsInsidePolygon { get; set; }
    public DateTime ExitTime { get; set; }
}