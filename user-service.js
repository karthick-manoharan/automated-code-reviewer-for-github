class UserService {
    constructor(name, email) {
        this.name = name;
        this.email = email;
    }

    // Returns a user's profile information
    getUserProfile() {
        var profile = {
            name: this.name,
            email: this.email,
            lastLogin: new Date()
        };
        return profile;
    }

    // A generic function to update user data
    updateData(key, value) {
        if (key == 'email') {
            // Basic email validation
            if (value.indexOf('@') == -1) {
                console.log('Invalid email provided');
                return;
            }
        }
        this[key] = value;
    }
}
