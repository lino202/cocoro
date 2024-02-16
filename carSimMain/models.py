# from django.db import models

# class File(models.Model):
#     name = models.CharField(max_length=255)
#     path = models.CharField(max_length=255)

# class Mesh(models.Model):
#     name = models.CharField(max_length=255)
#     elementType = models.CharField(max_length=10)   # Ideally line, tri, hexa

# class Point(models.Model):
#     mesh = models.ForeignKey(Mesh, on_delete=models.CASCADE)
#     x = models.FloatField()
#     y = models.FloatField()
#     z = models.FloatField()

# class PointVector(models.Model):
#     point = models.ForeignKey(Point, on_delete=models.CASCADE)
#     x = models.FloatField()
#     y = models.FloatField()
#     z = models.FloatField()

# class PointStim(models.Model):
#     point  = models.ForeignKey(Point, on_delete=models.CASCADE)
#     period = models.FloatField()
#     mag    = models.FloatField()
#     dur    = models.FloatField()
#     start  = models.FloatField()

# class PointConnections1D(models.Model):
#     point = models.ForeignKey(Point, on_delete=models.CASCADE)
#     iminus = models.IntegerField()
#     iplus = models.IntegerField()

# class PointConnections2D(models.Model):
#     point         = models.ForeignKey(Point, on_delete=models.CASCADE)
#     i_jplus       = models.IntegerField()
#     iplus_jplus   = models.IntegerField()
#     iplus_j       = models.IntegerField()
#     iplus_jminus  = models.IntegerField()
#     i_jminus      = models.IntegerField()
#     iminus_jminus = models.IntegerField()
#     iminus_j      = models.IntegerField()
#     iminus_jplus  = models.IntegerField()

# # From every mesh a superficial triangular elems (node connections) is extracted for renderization
# # This is different for the element types that can be quadrilaterals or hexahedrons.
# class RenderElementTriangle(models.Model):
#     mesh = models.ForeignKey(Mesh, on_delete=models.CASCADE)
#     x    = models.IntegerField()
#     y    = models.IntegerField()
#     z    = models.IntegerField()

# # In the line case the element for renderization matches the actual element
# class Element1D(models.Model):
#     mesh  = models.ForeignKey(Mesh, on_delete=models.CASCADE)
#     left  = models.IntegerField()
#     right = models.IntegerField()

# # For now we not use this elements as we use finite differences and no FEM
# # class Element2D(models.Model):
# #     mesh = models.ForeignKey(Mesh, on_delete=models.CASCADE)
# #     top_left     = models.IntegerField()
# #     top_right    = models.IntegerField()
# #     bottom_right = models.IntegerField()
# #     bottom_left  = models.IntegerField()

# # class Element3D(models.Model):
# #     mesh = models.ForeignKey(Mesh, on_delete=models.CASCADE)
# #     top_left_back      = models.IntegerField()
# #     top_right_back     = models.IntegerField()
# #     bottom_right_back  = models.IntegerField()
# #     bottom_left_back   = models.IntegerField()
# #     top_left_front     = models.IntegerField()
# #     top_right_front    = models.IntegerField()
# #     bottom_right_front = models.IntegerField()   
# #     bottom_left_front  = models.IntegerField()

