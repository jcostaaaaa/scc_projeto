const axios = require("axios");

describe("Auth", () => {
  it("should return 400 with a token", async () => {
    try {
      const response = await axios.post("http://localhost:9998/user/login", {
        username: "admin",
      });

      expect(response.status).toBe(400);

      expect(response.data.message).toBe("all fields are required");
    } catch (error) {
      expect(error.response.status).toBe(400);
      expect(error.response.data.message).toBe("all fields are required");
    }
  });
});

describe("Auth", () => {
  it("should return 200 with a token", async () => {
    const response = await axios.post("http://localhost:9998/user/login", {
      username: "admin",
      password: "admin123",
    });

    expect(response.status).toBe(200);
    expect(response.data.message).toBe("login success");
    expect(response.data.data).toHaveProperty("accessToken");
  });
});

describe("Auth", () => {
  it("should return 400 with a token", async () => {
    try {
      const response = await axios.post("http://localhost:9998/user/login", {
        username: "admin",
        password: "admin1234",
      });
    } catch (error) {
      expect(error.response.status).toBe(400); 
      expect(error.response.data.message).toBe("invalid credentials");
    }
  });
});
